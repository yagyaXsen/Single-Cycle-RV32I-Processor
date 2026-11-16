// ============================================================================
// build_report.js - generates docs/report/Detailed_Report_Team_Black_Coffee.docx
// All numbers come from docs/results.json (made by tools/collect_results.py).
// Run:  NODE_PATH=../report_tools_node/node_modules node tools/build_report.js
// ============================================================================
const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, ImageRun, Table, TableRow, TableCell,
  AlignmentType, HeadingLevel, WidthType, ShadingType, BorderStyle, PageBreak,
  Header, Footer, PageNumber, LevelFormat, TableOfContents, TabStopType, PageOrientation,
} = require("docx");

const ROOT = path.join(__dirname, "..");
const R = JSON.parse(fs.readFileSync(path.join(ROOT, "docs/results.json")));
const OUTDIR = path.join(ROOT, "docs/report");
fs.mkdirSync(OUTDIR, { recursive: true });

const FONT = "Times New Roman";
const MONO = "Courier New";
const CONTENT_W = 9026; // A4 width 11906 - 2 x 1440 margins
let figNo = 0, tabNo = 0;

// ---------------------------------------------------------------- helpers
function runs(text, base = {}) {
  // **bold**, `code`
  const out = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0, m;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(new TextRun({ text: text.slice(last, m.index), ...base }));
    const t = m[0];
    if (t.startsWith("**")) out.push(new TextRun({ text: t.slice(2, -2), bold: true, ...base }));
    else out.push(new TextRun({ text: t.slice(1, -1), font: MONO, size: 20, ...base }));
    last = m.index + t.length;
  }
  if (last < text.length) out.push(new TextRun({ text: text.slice(last), ...base }));
  return out;
}
const P = (t, o = {}) => new Paragraph({ children: runs(t), alignment: AlignmentType.JUSTIFIED, spacing: { after: 120, line: 300 }, ...o });
const H1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: true, children: [new TextRun(t)] });
const H2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(t)] });
const H3 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun(t)] });
const B = (t, lvl = 0) => new Paragraph({ numbering: { reference: "bullets", level: lvl }, children: runs(t), spacing: { after: 60, line: 280 } });
const N = (t) => new Paragraph({ numbering: { reference: "numbers", level: 0 }, children: runs(t), spacing: { after: 60, line: 280 } });
const CODE = (lines, size = 16) => lines.map((l) => new Paragraph({
  children: [new TextRun({ text: l.length ? l : " ", font: MONO, size })],
  spacing: { after: 0, line: 220 }, shading: { type: ShadingType.CLEAR, fill: "F4F6F8" },
}));

function pngSize(file) {
  const b = fs.readFileSync(file);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20), data: b };
}
function FIG(rel, caption, widthIn = 6.27, maxHIn = 8.5) {
  const f = path.join(ROOT, rel);
  const { w, h, data } = pngSize(f);
  let wpx = widthIn * 96, hpx = (wpx * h) / w;
  if (hpx > maxHIn * 96) { hpx = maxHIn * 96; wpx = (hpx * w) / h; }
  figNo++;
  return [
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120, after: 60 }, keepNext: true,
      children: [new ImageRun({ type: "png", data, transformation: { width: wpx, height: hpx },
        altText: { title: caption, description: caption, name: path.basename(f) } })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 },
      children: [new TextRun({ text: `Figure ${figNo}: `, bold: true, size: 20 }), new TextRun({ text: caption, italics: true, size: 20 })] }),
  ];
}
const border = { style: BorderStyle.SINGLE, size: 4, color: "8A949E" };
const borders = { top: border, bottom: border, left: border, right: border };
function TABLE(caption, headers, rows, widths, opts = {}) {
  const total = widths.reduce((a, b) => a + b, 0);
  const scale = CONTENT_W / total;
  const W = widths.map((x) => Math.floor(x * scale));
  W[W.length - 1] += CONTENT_W - W.reduce((a, b) => a + b, 0);
  const fs_ = opts.size || 19;
  const cell = (t, i, head, fill) => new TableCell({
    borders, width: { size: W[i], type: WidthType.DXA },
    shading: { type: ShadingType.CLEAR, fill: head ? "DCE6F2" : fill || "FFFFFF" },
    margins: { top: 50, bottom: 50, left: 90, right: 90 },
    children: [new Paragraph({ alignment: opts.center && i > 0 ? AlignmentType.CENTER : AlignmentType.LEFT,
      children: runs(String(t), { size: fs_, bold: head || undefined }) })],
  });
  tabNo++;
  return [
    new Paragraph({ keepNext: true, spacing: { before: 160, after: 80 },
      children: [new TextRun({ text: `Table ${tabNo}: `, bold: true, size: 20 }), new TextRun({ text: caption, italics: true, size: 20 })] }),
    new Table({ width: { size: CONTENT_W, type: WidthType.DXA }, columnWidths: W,
      rows: [new TableRow({ tableHeader: true, children: headers.map((h, i) => cell(h, i, true)) }),
        ...rows.map((r, ri) => new TableRow({ cantSplit: true, children: r.map((c, i) => cell(c, i, false, ri % 2 ? "F7F9FB" : "FFFFFF")) }))] }),
    new Paragraph({ spacing: { after: 120 }, children: [] }),
  ];
}
const sp = (n = 1) => Array.from({ length: n }, () => new Paragraph({ children: [] }));

// ---------------------------------------------------------------- data
const X = R.xilinx, E = R.ecp5, PF = R.perf, C = R.coverage_total;
const fmax = E.fmax_mhz;
const unitTests = R.unit.reduce((a, u) => a + u.tests, 0);
const killed = R.mutation.filter((m) => m.status === "KILLED").length;
const pct = (a, b) => ((100 * a) / b).toFixed(1) + "%";

// ---------------------------------------------------------------- content
// ---------------------------------------------------------------- team
const TEAM = {
  name: "Black Coffee", group: "B",
  programme: "B.Tech in Computer Science and Artificial Intelligence",
  institute: "Newton School of Technology, Rishihood University",
  course: "Modern Computer Architecture",
  repo: "https://github.com/yagyaXsen/Single-Cycle-RV32I-Processor",
  members: [
    { name: "Alok Kumar", roll: "2401010058", email: "alok.kumar2024@nst.rishihood.edu.in", role: "Team lead – architecture, control and integration" },
    { name: "Sharma Piyush", roll: "2401010437", email: "sharma.piyush2024@nst.rishihood.edu.in", role: "FPGA implementation, presentation and demo" },
    { name: "Gourav Tanwar", roll: "2401010173", email: "gourav.tanwar2024@nst.rishihood.edu.in", role: "Datapath storage – PC, register file, memories, immediate generator" },
    { name: "Saransh Singh Tomar", roll: "2401010418", email: "saransh.tomar2024@nst.rishihood.edu.in", role: "Execution units, assembler and test programs" },
    { name: "Rachit Singh", roll: "2401010364", email: "rachit.singh2024@nst.rishihood.edu.in", role: "Verification, waveforms and performance analysis" },
  ],
};
function plainTable(headers, rows, widths, size = 20, center = false) {
  const total = widths.reduce((a, b) => a + b, 0);
  const W = widths.map((x) => Math.floor((x * CONTENT_W) / total));
  W[W.length - 1] += CONTENT_W - W.reduce((a, b) => a + b, 0);
  const mk = (t, i, head) => new TableCell({ borders, width: { size: W[i], type: WidthType.DXA },
    shading: { type: ShadingType.CLEAR, fill: head ? "DCE6F2" : "FFFFFF" }, margins: { top: 60, bottom: 60, left: 90, right: 90 },
    children: [new Paragraph({ alignment: center ? AlignmentType.CENTER : AlignmentType.LEFT, children: [new TextRun({ text: String(t), size, bold: head || undefined })] })] });
  return new Table({ width: { size: CONTENT_W, type: WidthType.DXA }, columnWidths: W,
    rows: [new TableRow({ tableHeader: true, children: headers.map((h, i) => mk(h, i, true)) }),
      ...rows.map((r) => new TableRow({ cantSplit: true, children: r.map((c, i) => mk(c, i, false)) }))] });
}

const C_ = [];

// ===== Title page
const center = (text, o = {}, after = 80) => new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after }, children: [new TextRun({ text, size: 24, ...o })] });
C_.push(
  ...sp(1),
  center("PROJECT REPORT", { bold: true, size: 28, color: "1F4E8C" }, 120),
  center("on", { italics: true }, 120),
  center("Design and Verification of a", { bold: true, size: 40 }, 160),
  center("Single-Cycle RV32I Processor in Verilog", { bold: true, size: 40 }, 300),
  center(`${TEAM.course} – Verilog Project 1`, {}, 80),
  center("Area: RISC-V / CPU Datapath    |    Level: Intermediate+", { size: 22, color: "555555" }, 500),
  center("Submitted by", { italics: true }, 80),
  center(`Team ${TEAM.name}  (Group ${TEAM.group})`, { bold: true, size: 28 }, 200),
  plainTable(["S. No.", "Name", "Roll No.", "Email"], TEAM.members.map((m, i) => [i + 1, m.name, m.roll, m.email]), [0.8, 2.6, 1.6, 4.4], 20),
  ...sp(2),
  center(TEAM.programme, {}, 60),
  center(TEAM.institute, { bold: true }, 60),
  center("November 2026"),
);

// ===== Declaration / acknowledgement
C_.push(
  new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: true, children: [new TextRun("Declaration")] }),
  P(`We, the members of Team ${TEAM.name} (Group ${TEAM.group}), hereby declare that the project report entitled **“Design and Verification of a Single-Cycle RV32I Processor in Verilog”**, submitted for the course ${TEAM.course} at ${TEAM.institute}, is a record of original work carried out by us. The contribution of each member is described in Chapter 11. The results embodied in this report have not been submitted elsewhere for the award of any degree or diploma.`),
  ...sp(1),
  plainTable(["Name", "Roll No.", "Signature"], TEAM.members.map((m) => [m.name, m.roll, " "]), [3.5, 2.2, 3.3], 21),
  ...sp(1),
  P("Date: ____________________"),
  new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 480, after: 200 }, children: [new TextRun("Acknowledgement")] }),
  P(`We express our sincere gratitude to the course instructor and teaching assistants of ${TEAM.course} at ${TEAM.institute} for their guidance and for the clear project specification, which provided the foundation for this work. We also thank the developers of the open-source tools used in this project — Icarus Verilog, Yosys, nextpnr and Surfer/GTKWave.`),
);

// ===== Abstract
C_.push(
  new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: true, children: [new TextRun("Abstract")] }),
  P(`This project presents the design, implementation and verification of a compact **single-cycle 32-bit RISC-V processor** written in synthesizable Verilog. The processor executes a subset of the RV32I base integer instruction set — **ADD, SUB, AND, OR, XOR, ADDI, LW, SW, BEQ and BNE** — with every instruction completing in exactly one clock cycle (CPI = 1). The design is organised as a modular hierarchy of the components suggested in the project specification: Program Counter, Instruction Memory, Control Unit (instruction decoder), 32 × 32-bit Register File, Immediate Generator, ALU, Data Memory and Write-Back multiplexer, together with an ALU-control block, a branch unit and adders.`),
  P(`Verification uses a self-checking methodology: a small assembler converts test programs to machine code, and an independent Python golden reference model (instruction-set simulator) produces the expected final state. The Verilog testbench runs seven programs (directed tests and benchmarks such as array sum and Fibonacci) and compares **all 32 registers, every data-memory word, the final PC and the instruction count** with the reference. Four unit testbenches add ${unitTests} further checks. All tests pass, a random clock-enable stall test passes, and a **mutation test detected ${killed} of ${R.mutation.length} deliberately injected bugs**, demonstrating the strength of the testbench.`),
  P(`The design was synthesized with Yosys for a Xilinx Artix-7 (Basys-3) target, using about **${X.total_luts} LUTs (${pct(X.total_luts, X.lut_avail)}) and ${X.ffs} flip-flops**, and was placed and routed on a Lattice ECP5 FPGA with nextpnr, achieving a **maximum clock frequency of ${fmax.toFixed(1)} MHz** (critical path ${PF.critical_path_ns.toFixed(2)} ns through the LW instruction path). At this frequency the processor delivers ${fmax.toFixed(1)} MIPS. A comparison with an analytically modelled multi-cycle implementation of the same ISA shows the single-cycle design to be 1.02–1.27× faster on the test programs, and the analysis explains why pipelining (Project 3) is the next step.`),
  P(`The project was carried out by the five members of Team ${TEAM.name} (Group ${TEAM.group}); the work of each member is described in Chapter 11, and the complete source code is available at ${TEAM.repo}.`),
  P("**Keywords:** RISC-V, RV32I, single-cycle processor, datapath, control unit, Verilog HDL, FPGA, verification, CPI."),
);

// ===== Contents
C_.push(
  new Paragraph({ pageBreakBefore: true, spacing: { before: 240, after: 240 }, children: [new TextRun({ text: "Table of Contents", bold: true, size: 32, color: "1F4E8C" })] }),
  new TableOfContents("Table of Contents", { hyperlink: true, headingStyleRange: "1-2" }),
);

// ===== 1 Introduction
C_.push(
  H1("1. Introduction"),
  H2("1.1 Background"),
  P("A processor executes a program by repeating the fetch–decode–execute cycle: it fetches an instruction from memory, decodes it to find out what to do, executes the operation, accesses memory if required and writes the result back. The simplest hardware organisation that implements this cycle is the **single-cycle processor**, in which the whole cycle for one instruction happens within one clock period. Although slower than pipelined designs, it is the clearest way to understand how an instruction set is turned into a datapath and control logic, and it is the foundation on which pipelined, multi-cycle and multicore processors are built."),
  P("**RISC-V** is an open, royalty-free instruction set architecture (ISA) developed at UC Berkeley and now maintained by RISC-V International. Its base integer ISA, **RV32I**, has a small, regular set of 32-bit instructions with a few fixed formats, which makes it ideal for teaching and for compact hardware implementations."),
  H2("1.2 Objective"),
  P("As stated in the project specification, the objective is to **design and verify a compact single-cycle RISC-V processor in Verilog that executes a selected subset of RV32I instructions**. The specific goals are:"),
  B("Implement the suggested Verilog modules: Program Counter (PC), Instruction Memory, Instruction Decoder/Control Unit, 32×32 Register File, Immediate Generator, ALU, Data Memory and Write-Back MUX."),
  B("Support the suggested instruction set: ADD, SUB, AND, OR, XOR, ADDI, LW, SW, BEQ and BNE."),
  B("Create instruction-memory test programs and verify register and memory results with a dedicated testbench and waveforms."),
  B("Synthesize the design, report resource utilisation and maximum operating frequency, and prepare an FPGA implementation."),
  B("Measure performance (CPI, execution time, MIPS) and compare against a baseline architecture."),
  H2("1.3 Scope of the work"),
  ...TABLE("Mapping of project requirements to this work", ["Requirement (from project specification)", "Where it is addressed"], [
    ["Block diagram and explanation", "Chapter 3 (Figure 2), Chapter 4"],
    ["Microarchitecture description", "Chapters 3–5 (datapath, control tables, per-instruction operation)"],
    ["Synthesizable modular Verilog RTL", "Chapter 5, Appendix A (rtl/ folder, 13 files)"],
    ["Dedicated testbench with directed test cases", "Chapter 6 (5 testbenches, 7 programs)"],
    ["Functional simulation and waveform verification", "Chapter 6.7 (waveforms), sim/*.vcd"],
    ["At least one quantitative performance metric", "Chapter 8 (CPI, execution time, MIPS, Fmax)"],
    ["Synthesis results: resources and Fmax", "Chapter 7"],
    ["Comparison against a baseline architecture", "Chapter 8.3 (multi-cycle baseline)"],
    ["FPGA implementation (if available)", "Chapter 9 (Basys-3 wrapper, constraints, Vivado script)"],
    ["Final technical report and live demonstration", "This report; Chapter 9.3 demo procedure; slides"],
    ["Work of individual team members", "Chapter 11 (team members and individual contributions)"],
  ], [5, 5]),
  H2("1.4 Tools used"),
  ...TABLE("Software tools", ["Tool", "Version", "Purpose"], [
    ["Icarus Verilog (iverilog / vvp)", "13.0", "Verilog compilation and simulation"],
    ["Surfer / GTKWave", "0.7.0 / any", "Waveform viewing (VCD files)"],
    ["Yosys", "0.71", "Logic synthesis (generic, Xilinx 7-series, Lattice ECP5)"],
    ["nextpnr-ecp5", "YoWASP build", "FPGA place and route, timing analysis (Fmax)"],
    ["Python 3 + matplotlib", "3.14", "Assembler, golden reference model, waveform and chart rendering"],
    ["Xilinx Vivado (lab PC)", "any recent", "Optional: Basys-3 implementation and bitstream (script provided)"],
  ], [4, 2, 6]),
  H2("1.5 Organisation of the report"),
  P("Chapter 2 reviews the RISC-V ISA subset and the single-cycle concept. Chapter 3 presents the architecture and block diagram, Chapter 4 the control unit and per-instruction operation, and Chapter 5 the RTL implementation. Chapter 6 describes the verification methodology and results, Chapter 7 the synthesis results, Chapter 8 the performance analysis and baseline comparison, and Chapter 9 the FPGA implementation and demonstration. Chapter 10 concludes the report and Chapter 11 describes the contribution of each team member. The appendices contain the complete Verilog source code, a test-program listing and instructions to reproduce every result."),
);

// ===== 2 Background
C_.push(
  H1("2. RISC-V ISA and the Single-Cycle Concept"),
  H2("2.1 RV32I programmer's model"),
  P("RV32I has **32 general-purpose registers x0–x31**, each 32 bits wide, and a 32-bit program counter (PC). Register **x0 is hard-wired to zero**: writes to it are ignored and reads always return 0. Memory is byte-addressed and little-endian; instructions are 32 bits long and word-aligned, so the PC normally advances by 4. RISC-V is a **load/store architecture**: arithmetic instructions operate only on registers, and only LW/SW access memory."),
  H2("2.2 Instruction formats"),
  P("The ten supported instructions use four of the six RV32I formats (Figure 1). The register specifiers rs1, rs2 and rd always occupy the same bit positions in every format, which allows the register file to be read in parallel with decoding. The sign bit of every immediate is always instruction bit 31, which simplifies sign extension."),
  ...FIG("docs/diagrams/instr_formats.png", "RV32I instruction formats used by the supported instructions"),
  ...TABLE("Supported instructions and their semantics", ["Instruction", "Format", "Operation", "Encoding (opcode / funct3 / funct7)"], [
    ["ADD rd, rs1, rs2", "R", "rd ← rs1 + rs2", "0110011 / 000 / 0000000"],
    ["SUB rd, rs1, rs2", "R", "rd ← rs1 − rs2", "0110011 / 000 / 0100000"],
    ["AND rd, rs1, rs2", "R", "rd ← rs1 & rs2", "0110011 / 111 / 0000000"],
    ["OR rd, rs1, rs2", "R", "rd ← rs1 | rs2", "0110011 / 110 / 0000000"],
    ["XOR rd, rs1, rs2", "R", "rd ← rs1 ^ rs2", "0110011 / 100 / 0000000"],
    ["ADDI rd, rs1, imm", "I", "rd ← rs1 + sext(imm12)", "0010011 / 000 / –"],
    ["LW rd, imm(rs1)", "I", "rd ← Mem[rs1 + sext(imm12)]", "0000011 / 010 / –"],
    ["SW rs2, imm(rs1)", "S", "Mem[rs1 + sext(imm12)] ← rs2", "0100011 / 010 / –"],
    ["BEQ rs1, rs2, off", "B", "if (rs1 == rs2) PC ← PC + sext(off13)", "1100011 / 000 / –"],
    ["BNE rs1, rs2, off", "B", "if (rs1 != rs2) PC ← PC + sext(off13)", "1100011 / 001 / –"],
  ], [2.6, 1, 3.6, 3.4]),
  P("With these ten instructions it is possible to write real programs: ADDI loads constants (`li`), copies registers (`mv`) and steps loop counters; BEQ with x0 gives an unconditional jump (`j`); and the program end is marked by `beq x0, x0, 0`, a jump-to-self used as **HALT** in this project."),
  H2("2.3 Single-cycle execution"),
  P("In a single-cycle processor the clock period must be long enough for the **slowest instruction** to pass through every stage of the datapath. State elements (PC, register file, data memory) are written only at the rising clock edge, while everything between them is combinational logic. Consequently:"),
  B("CPI (cycles per instruction) is exactly 1 for every instruction."),
  B("Execution time = Instruction count × CPI × Clock period = N × T_clk."),
  B("The clock period is set by the longest path, which is the load (LW) path: instruction memory → register read → ALU → data memory → write-back. Faster instructions such as ADD or BEQ waste part of the cycle — the main drawback addressed by multi-cycle and pipelined designs."),
);

// ===== 3 Architecture
C_.push(
  H1("3. System Architecture"),
  H2("3.1 Top-level block diagram"),
  P("Figure 2 shows the complete datapath and control of the processor. The coloured bands mark the five logical steps of instruction execution; in a single-cycle design they all occur in the same clock cycle. Solid lines are 32-bit data/address paths and dashed blue lines are control signals."),
  ...FIG("docs/diagrams/datapath.png", "Single-cycle RV32I datapath and control (block diagram)"),
  H2("3.2 Module hierarchy"),
  P("The RTL follows a strictly modular hierarchy (Figure 3). Every block of Figure 2 is a separate Verilog module, instantiated and wired together in the top-level module `rv32i_cpu`. An FPGA wrapper `fpga_top` adds board I/O for demonstration."),
  ...FIG("docs/diagrams/module_hierarchy.png", "Verilog module hierarchy"),
  H2("3.3 Description of each module"),
  H3("Program Counter (pc.v)"),
  P("A 32-bit register holding the byte address of the current instruction. On each rising clock edge it loads `next_pc` when the clock-enable `en` is high; a synchronous active-high reset sets it to 0x00000000."),
  H3("Instruction Memory (instr_mem.v)"),
  P("A 256 × 32-bit (1 KB) read-only memory initialised from a hex file with `$readmemh`. It is read **asynchronously** so that the instruction is available in the same cycle. Because instructions are word-aligned, the word index is `addr[9:2]`."),
  H3("Control Unit / Instruction Decoder (control_unit.v)"),
  P("Decodes the opcode (and funct3/funct7 to reject unsupported encodings) and generates RegWrite, ALUSrc, MemRead, MemWrite, MemToReg, Branch, a 2-bit ALUOp and the immediate-format select ImmSel. Any unsupported instruction raises `illegal` and is executed as a **NOP** (no register or memory write), which keeps the processor in a safe state."),
  H3("ALU Control (alu_control.v)"),
  P("A second-level decoder that converts ALUOp together with funct3 and funct7[5] (instruction bit 30) into the 4-bit operation code for the ALU. This two-level decoding, as in the classic Patterson–Hennessy design, keeps the main control unit small."),
  H3("Register File (reg_file.v)"),
  P("32 registers of 32 bits with **two asynchronous read ports** (rs1, rs2) and **one synchronous write port** (rd). Writes to x0 are blocked and reads of x0 return 0. Writing at the clock edge means an instruction reads the old register values and its result becomes visible to the next instruction, which is exactly the required sequential semantics."),
  H3("Immediate Generator (imm_gen.v)"),
  P("Extracts the immediate from the I, S or B format (selected by ImmSel) and sign-extends it to 32 bits. For B-type the scattered bits imm[12|10:5|4:1|11] are reassembled and bit 0 is forced to 0, since branch targets are multiples of 2."),
  H3("ALU (alu.v)"),
  P("Performs ADD, SUB, AND, OR and XOR on two 32-bit operands and outputs a `zero` flag that is 1 when the result is zero. Branches subtract rs2 from rs1 and use the zero flag to test equality."),
  H3("Branch Unit (branch_unit.v) and adders (adder.v)"),
  P("One adder computes PC + 4, another computes the branch target PC + imm. The branch unit asserts PCSrc when Branch = 1 and the condition holds (zero for BEQ, not-zero for BNE); PCSrc then selects the branch target in the next-PC multiplexer."),
  H3("Data Memory (data_mem.v)"),
  P("A 256 × 32-bit (1 KB) RAM with asynchronous read (for LW within the same cycle) and synchronous write at the clock edge (for SW). The address comes from the ALU (rs1 + offset) and the write data from rs2."),
  H3("Multiplexers (mux2.v)"),
  P("A parameterised 2-to-1 multiplexer instantiated three times: the **ALU-source MUX** (rs2 or immediate), the **Write-Back MUX** (ALU result or memory data) and the **next-PC MUX** (PC + 4 or branch target)."),
);

// ===== 4 Control
C_.push(
  H1("4. Control Unit and Datapath Operation"),
  H2("4.1 Main control signals"),
  P("Table 4 is the complete truth table of the main control unit. It was verified exhaustively by the unit testbench `tb_control_unit` (Chapter 6)."),
  ...TABLE("Main control unit truth table", ["Instr.", "RegWrite", "ALUSrc", "MemRead", "MemWrite", "MemToReg", "Branch", "ALUOp", "ImmSel"], [
    ["R-type", "1", "0", "0", "0", "0", "0", "10", "–"],
    ["ADDI", "1", "1", "0", "0", "0", "0", "11", "I"],
    ["LW", "1", "1", "1", "0", "1", "0", "00", "I"],
    ["SW", "0", "1", "0", "1", "x", "0", "00", "S"],
    ["BEQ/BNE", "0", "0", "0", "0", "x", "1", "01", "B"],
    ["illegal", "0", "0", "0", "0", "0", "0", "00", "–"],
  ], [1.4, 1.2, 1, 1.1, 1.1, 1.2, 1, 1, 1], { center: true }),
  ...TABLE("ALU control", ["ALUOp", "funct7[5]", "funct3", "Operation", "ALU code", "Used by"], [
    ["00", "x", "xxx", "ADD", "0000", "LW, SW (address)"],
    ["01", "x", "xxx", "SUB", "0001", "BEQ, BNE (compare)"],
    ["10", "0", "000", "ADD", "0000", "ADD"],
    ["10", "1", "000", "SUB", "0001", "SUB"],
    ["10", "0", "111", "AND", "0010", "AND"],
    ["10", "0", "110", "OR", "0011", "OR"],
    ["10", "0", "100", "XOR", "0100", "XOR"],
    ["11", "x", "000", "ADD", "0000", "ADDI"],
  ], [1, 1, 1, 1, 1, 2], { center: true }),
  H2("4.2 How each instruction flows through the datapath"),
  H3("R-type (ADD, SUB, AND, OR, XOR)"),
  P("The PC addresses instruction memory. rs1 and rs2 are read from the register file. ALUSrc = 0 sends rs2 to the ALU, the ALU control decodes funct3/funct7 to select the operation, MemToReg = 0 routes the ALU result to the write-back bus and RegWrite = 1 stores it in rd at the clock edge. PCSrc = 0, so PC ← PC + 4."),
  H3("ADDI"),
  P("Identical to ADD except that ALUSrc = 1 selects the sign-extended I-type immediate as the second ALU operand. Example: `addi x10, x9, -2047` with x9 = −1 writes −2048 to x10."),
  H3("LW (load word) — the longest path"),
  P("The ALU adds rs1 and the I-type immediate to form the address; MemRead = 1 reads the data memory and MemToReg = 1 routes the memory data through the write-back MUX into rd. This path uses **every** major block in series, which is why it sets the clock period (Chapter 7.3)."),
  H3("SW (store word)"),
  P("The address is formed in the same way using the S-type immediate (bits split between [31:25] and [11:7]). rs2 is routed to the data-memory write-data port and MemWrite = 1 stores it at the clock edge. RegWrite = 0, so no register changes."),
  H3("BEQ / BNE"),
  P("The ALU subtracts rs2 from rs1 (ALUOp = 01). In parallel, the branch adder computes PC + B-immediate. The branch unit asserts PCSrc if zero = 1 for BEQ or zero = 0 for BNE, and the next-PC MUX selects the branch target; otherwise PC ← PC + 4. No register or memory is written."),
);

// ===== 5 RTL
const rtlFiles = ["defines.vh", "pc.v", "instr_mem.v", "control_unit.v", "alu_control.v", "reg_file.v", "imm_gen.v", "alu.v", "data_mem.v", "branch_unit.v", "adder.v", "mux2.v", "rv32i_cpu.v"];
const rtlDesc = { "defines.vh": "Opcode, funct3, ALUOp and ALU-code constants", "pc.v": "Program Counter", "instr_mem.v": "Instruction Memory (256 × 32 ROM)", "control_unit.v": "Main control unit / instruction decoder", "alu_control.v": "ALU control (second-level decoder)", "reg_file.v": "32 × 32 Register File", "imm_gen.v": "Immediate Generator (I/S/B)", "alu.v": "Arithmetic Logic Unit", "data_mem.v": "Data Memory (256 × 32 RAM)", "branch_unit.v": "Branch decision (BEQ/BNE)", "adder.v": "32-bit adder (PC+4, branch target)", "mux2.v": "Parameterised 2:1 MUX (ALUSrc, Write-Back, next-PC)", "rv32i_cpu.v": "Top-level processor integrating all modules" };
const lineCount = (f) => fs.readFileSync(path.join(ROOT, "rtl", f), "utf8").split("\n").length;
C_.push(
  H1("5. RTL Implementation"),
  H2("5.1 Source files"),
  ...TABLE("RTL source files (rtl/ folder)", ["File", "Description", "Lines"], rtlFiles.map((f) => [`\`${f}\``, rtlDesc[f], String(lineCount(f))]), [2.4, 6, 1]),
  H2("5.2 Design decisions"),
  B("**Synthesizable Verilog-2001 only.** No simulation-only constructs are used in the RTL apart from memory initialisation, which FPGA tools support. `default_nettype none` catches undeclared wires."),
  B("**Asynchronous read, synchronous write memories.** This is what a single-cycle design requires and maps to distributed (LUT) RAM on FPGAs."),
  B("**Two-level decoding** (main control + ALU control) for clarity and smaller logic."),
  B("**Safe handling of unsupported instructions:** they are flagged `illegal` and executed as NOPs, so a corrupted program cannot write random state."),
  B("**Clock enable (`en`) instead of a divided clock.** The CPU can be paused or single-stepped without creating a second clock domain, which is the correct FPGA practice; the FPGA wrapper uses it for a slow-step demonstration mode."),
  B("**Debug/observation ports** (PC, instruction, write-back bus, store bus) let the testbench and the FPGA wrapper observe the CPU without modifying its internals."),
  B("**Parameterisation:** memory depths and the program file are parameters, so the same RTL is used for every test program, synthesis and the FPGA build."),
  H2("5.3 Top-level interface"),
  ...TABLE("Ports of rv32i_cpu", ["Port", "Dir.", "Width", "Description"], [
    ["clk", "in", "1", "Clock (all state updates on the rising edge)"],
    ["rst", "in", "1", "Synchronous active-high reset (PC ← 0)"],
    ["en", "in", "1", "Clock enable: 1 = execute one instruction per cycle, 0 = freeze"],
    ["dbg_pc / dbg_instr", "out", "32 / 32", "Current PC and instruction"],
    ["dbg_reg_write / dbg_rd / dbg_wb_data", "out", "1 / 5 / 32", "Register write-back bus"],
    ["dbg_mem_write / dbg_mem_addr / dbg_mem_wdata", "out", "1 / 32 / 32", "Data-memory store bus"],
    ["dbg_illegal", "out", "1", "Current instruction is unsupported (executed as NOP)"],
  ], [3.6, 0.8, 1.4, 4.4]),
  P("The full source code of every module is listed in Appendix A."),
);

// ===== 6 Verification
const progRows = [
  ["alu_test", "ADD, SUB, AND, OR, XOR, ADDI: positive/negative values, wrap-around, 12-bit immediate limits, writes to x0"],
  ["mem_test", "LW/SW: positive, negative and zero offsets; first and last word of 1 KB; unwritten word; load into x0; load-use"],
  ["branch_test", "BEQ/BNE taken and not taken, forward and backward branches, loops, unconditional jump; error counter must stay 0"],
  ["illegal_test", "SLT, SLL, XORI, SB, JAL, LUI, AUIPC and a zero word must act as NOPs without changing marker registers"],
  ["array_sum", "Benchmark: store a 10-element array with SW, sum it in a loop with LW (a0 = 39)"],
  ["fibonacci", "Benchmark: compute and store the first 20 Fibonacci numbers (a0 = F(19) = 4181)"],
  ["full_test", "All 10 instructions in one program; count/sum/XOR/OR/AND over an array (a0 = 62); used for synthesis and FPGA demo"],
];
C_.push(
  H1("6. Verification"),
  H2("6.1 Methodology"),
  P("Verification follows a **self-checking, reference-model-based** approach (Figure 4). Each test program is written in RISC-V assembly and converted to machine code by a small assembler written for this project (`tools/assembler.py`). An independent **golden reference model** (`tools/iss.py`), a Python instruction-set simulator written directly from the ISA definition, executes the same machine code and produces the expected final state. The Verilog testbench runs the processor until HALT and compares its state with the reference automatically, printing PASS or FAIL — no result is checked by eye."),
  ...FIG("docs/diagrams/verification_flow.png", "Verification methodology"),
  P("For every program the CPU testbench `tb_rv32i_cpu.v` checks:"),
  B("all **32 registers** and all **256 data-memory words** against the reference;"),
  B("the **final PC** and the **number of executed instructions** (this catches wrong branch targets that happen to land on the same code);"),
  B("instruction **coverage**: how often each instruction, each branch outcome, backward branches, negative immediates, writes to x0 and illegal instructions occurred;"),
  B("an execution **trace log** (PC, instruction, register write, store, branch decision per cycle) and a **VCD waveform**."),
  H2("6.2 Unit testbenches"),
  ...TABLE("Unit testbench results", ["Testbench", "What is checked", "Checks", "Result"], [
    ["tb_alu", "10 directed corner cases + 1000 random vectors for each of the 5 operations, result and zero flag vs. reference", String(R.unit[0].tests), R.unit[0].result],
    ["tb_reg_file", "Write/read of all 32 registers on both ports, x0 hard-wired, write enable, write only at clock edge", String(R.unit[1].tests), R.unit[1].result],
    ["tb_imm_gen", "I/S/B immediates from real encodings incl. max/min values and negative offsets", String(R.unit[2].tests), R.unit[2].result],
    ["tb_control_unit", "Full control truth table for all 10 instructions + 8 unsupported encodings", String(R.unit[3].tests), R.unit[3].result],
  ], [2, 6, 1, 1]),
  H2("6.3 Test programs"),
  ...TABLE("Instruction-memory test programs", ["Program", "Purpose / what it covers", "Static", "Executed"], progRows.map(([p, d]) => [p, d, String(R.programs[p].static), String(R.programs[p].dynamic)]), [1.6, 6.2, 0.9, 1]),
  H2("6.4 System test results"),
  ...TABLE("CPU testbench results (golden-model comparison)", ["Program", "Instructions", "Cycles", "CPI", "Result", "Stall test (cycles frozen)", "Stall result"], R.cpu.map((c, i) => [c.program, String(c.instructions), String(c.instructions), "1.00", c.result, String(R.stall[i].stall_cycles), R.stall[i].result]), [1.8, 1.2, 1, 0.8, 1, 2, 1.2], { center: true }),
  P(`All seven programs pass. The **stall test** reruns every program while the clock-enable is pulled low on pseudo-random cycles (${R.stall.reduce((a, s) => a + s.stall_cycles, 0)} frozen cycles in total); the final state is identical, proving that the processor holds its state correctly when paused.`),
  P("Key final values were also checked by hand against the expected results written in the program comments (Table 11):"),
  ...TABLE("Selected final results", ["Program", "Check", "Expected", "Simulated"], [
    ["alu_test", "x5 = 10 − 15", "−5 (0xFFFFFFFB)", "0xfffffffb"],
    ["alu_test", "x10 = −1 + (−2047)", "−2048", "0xfffff800"],
    ["mem_test", "x15 = 2 × mem[0x44]", "−400", "0xfffffe70"],
    ["branch_test", "error counter x20", "0", "0"],
    ["array_sum", "a0 = sum of array; mem[0x200]", "39", "39"],
    ["fibonacci", "a0 = F(19); mem[0x0CC]", "4181", "4181"],
    ["full_test", "a0 = sum − count", "62", "62"],
  ], [1.6, 3.6, 2.2, 2]),
  H2("6.5 Coverage"),
  ...TABLE("Dynamic instruction coverage over all programs", ["Item", "Count", "Item", "Count"], [
    ["ADD", C.add, "BEQ taken", C.beq_taken], ["SUB", C.sub, "BEQ not taken", C.beq_not_taken],
    ["AND", C.and, "BNE taken", C.bne_taken], ["OR", C.or, "BNE not taken", C.bne_not_taken],
    ["XOR", C.xor, "Backward branches taken", C.backward_branch], ["ADDI", C.addi, "Negative immediates", C.negative_imm],
    ["LW", C.lw, "Writes to x0 (ignored)", C.x0_write], ["SW", C.sw, "Illegal instructions (NOP)", C.illegal],
  ].map((r) => r.map(String)), [2.5, 1, 3.2, 1], { center: true }),
  P("Every instruction and every branch outcome (taken / not taken for both BEQ and BNE) is exercised, together with the corner cases listed above."),
  H2("6.6 Mutation testing — how good is the testbench?"),
  P("A passing testbench is only meaningful if it would fail on a buggy design. To measure this, `scripts/mutation_test.sh` creates copies of the RTL, each with **one deliberately injected bug**, and runs the full test suite (normal and stall mode) on each. A mutant is “killed” if at least one test fails."),
  ...TABLE("Mutation test results", ["#", "Injected bug", "Result", "Detected by"], R.mutation.map((m) => [String(m.id), m.bug, m.status, m.detected_by]), [0.5, 3.4, 1.1, 5]),
  P(`**Mutation score: ${killed} / ${R.mutation.length}.** During development this analysis exposed three weaknesses in the first version of the testbench, all of which were fixed: (1) a wrong branch target could land on identical code because the 1 KB instruction memory wraps around — fixed by also comparing the final PC and instruction count; (2) illegal instructions writing a register went unnoticed because the destination already held zero — fixed by preloading marker values; (3) the clock-enable was never exercised — fixed by adding the stall test.`),
  { SECTION: "landscape" },
  H2("6.7 Waveform evidence"),
  P("The following waveforms were produced by the simulation (`sim/cpu_*.vcd`) and rendered from the VCD files. Each column is one clock cycle, i.e. one instruction; the “assembly” row shows the decoded instruction. Note that register and memory contents change at the **end** of the cycle (rising edge), so a register row (e.g. regs[10]) shows the new value one column after the instruction that wrote it."),
  ...FIG("docs/waveforms/wave_alu_test_1.png", "ALU instructions: control signals, operands and write-back values", 9.6, 5.25),
  ...FIG("docs/waveforms/wave_alu_test_2.png", "ALU test continued: writes to x0 are ignored (x16 = 0 + 15 proves x0 is still 0)", 9.6, 5.25),
  ...FIG("docs/waveforms/wave_mem_test_1.png", "SW and LW: address = rs1 + imm, store data = rs2, MemRead/MemWrite/MemToReg", 9.6, 5.25),
  ...FIG("docs/waveforms/wave_mem_test_2.png", "Memory test continued: first/last word, unwritten word, load into x0, load-use", 9.6, 5.25),
  ...FIG("docs/waveforms/wave_branch_test_1.png", "BEQ/BNE taken and not taken: zero flag, PCSrc and next-PC selection", 9.6, 5.25),
  ...FIG("docs/waveforms/wave_branch_test_2.png", "Backward branch loops (BNE) and unconditional jump (BEQ x0, x0)", 9.6, 5.25),
  ...FIG("docs/waveforms/wave_illegal_test.png", "Unsupported instructions: illegal = 1, RegWrite = MemWrite = 0, PC advances by 4", 9.6, 5.25),
  ...FIG("docs/waveforms/wave_array_sum_loop.png", "Array-sum benchmark loop: a0 (regs[10]) accumulates 3, 4, 8, ...", 9.6, 5.25),
  ...FIG("docs/waveforms/wave_fibonacci.png", "Fibonacci benchmark: one SW per iteration stores F(i)", 9.6, 5.25),
  ...FIG("docs/waveforms/wave_full_test_end.png", "Full test: loop exit, BEQ check and final stores (a0 = 62)", 9.6, 5.25),
  { SECTION: "portrait" },
);

// ===== 7 Synthesis
const xc = X.cells;
C_.push(
  new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("7. Synthesis Results")] }),
  H2("7.1 Synthesis flow"),
  P("The flow follows the one suggested in the project specification: Verilog RTL → simulation → waveform verification → synthesis → timing/resource analysis → FPGA implementation. Because Xilinx Vivado does not run on macOS, the open-source Yosys/nextpnr tool chain was used (`scripts/synth.sh`), and a ready-to-run Vivado script is provided for the lab (Chapter 9). Three runs were made, all with the `full_test` program loaded in instruction memory:"),
  N("**Xilinx Artix-7 (XC7A35T, Basys-3 board)** — Yosys `synth_xilinx` resource estimate."),
  N("**Lattice ECP5 (LFE5U-25F)** — Yosys `synth_ecp5` followed by full **place and route with nextpnr**, giving a real post-route maximum frequency."),
  N("**Technology-independent gate count** — Yosys generic synthesis to basic gates."),
  H2("7.2 Resource utilisation"),
  ...TABLE("Xilinx Artix-7 (XC7A35T) resource estimate for fpga_top", ["Resource", "Used", "Available", "Utilisation", "Notes"], [
    ["Logic LUTs (LUT1–LUT6)", String(X.logic_luts), "20 800", pct(X.logic_luts, 20800), "decoder, ALU, MUXes, ROM"],
    ["LUTs as distributed RAM", String(X.lutram_luts), "–", "–", `${xc.RAM32M || 0} × RAM32M (register file), ${xc.RAM256X1S || 0} × RAM256X1S (data memory)`],
    ["Total LUTs", String(X.total_luts), "20 800", pct(X.total_luts, 20800), ""],
    ["Flip-flops (FDRE)", String(X.ffs), "41 600", pct(X.ffs, 41600), "PC, LED register, slow-step divider, reset sync"],
    ["CARRY4", String(X.carry4), "8 150", pct(X.carry4, 8150), "adders and subtractor"],
    ["MUXF7 / MUXF8", `${xc.MUXF7 || 0} / ${xc.MUXF8 || 0}`, "–", "–", "wide multiplexers"],
    ["I/O pins", String(X.io), "106", pct(X.io, 106), "clock, reset, 2 switches, 16 LEDs"],
  ], [2.6, 0.9, 1.1, 1.1, 4.3], { center: true }),
  ...TABLE("Lattice ECP5 LFE5U-25F after place and route (nextpnr)", ["Resource", "Used", "Available", "Utilisation"], [
    ["Logic cells (TRELLIS_COMB, LUT4)", String(E.TRELLIS_COMB[0]), String(E.TRELLIS_COMB[1]), pct(...E.TRELLIS_COMB)],
    ["Flip-flops (TRELLIS_FF)", String(E.TRELLIS_FF[0]), String(E.TRELLIS_FF[1]), pct(...E.TRELLIS_FF)],
    ["Distributed RAM write ports (TRELLIS_RAMW)", String(E.TRELLIS_RAMW[0]), String(E.TRELLIS_RAMW[1]), pct(...E.TRELLIS_RAMW)],
    ["Block RAM (DP16KD)", String(E.DP16KD[0]), String(E.DP16KD[1]), pct(...E.DP16KD)],
    ["I/O", String(E.TRELLIS_IO[0]), String(E.TRELLIS_IO[1]), pct(...E.TRELLIS_IO)],
    ["Maximum frequency (post-route)", `${fmax.toFixed(2)} MHz`, "–", "–"],
  ], [4.4, 1.6, 1.6, 1.4], { center: true }),
  P(`On ECP5 the instruction ROM was mapped into one block RAM: the synthesis tool merged the PC register into the RAM's synchronous address register, which is legal because the ROM is addressed only by the PC. The register file and data memory use distributed RAM. In the technology-independent run, where memories are expanded into individual flip-flops and multiplexers, the CPU core corresponds to about **${(R.generic.cells || 0).toLocaleString("en-IN")} basic gates and flip-flops**, of which ${(R.generic["$_DFFE_PP_"] || 0).toLocaleString("en-IN")} are memory bits — showing that the memories, not the logic, dominate the raw size of the design.`),
  H2("7.3 Timing and critical path"),
  P(`The post-route timing report identifies a critical path of **${PF.critical_path_ns.toFixed(2)} ns**, i.e. **Fmax = ${fmax.toFixed(2)} MHz**. As predicted by theory, it is the **load-word path**, which passes through every major block (Figure 15).`),
  ...FIG("docs/perf/chart_critical_path.png", "Breakdown of the critical path (measured, ECP5 post-route)"),
  ...TABLE("Critical-path stage delays", ["Stage", "Delay (ns)", "Share of cycle"], Object.entries(PF.stages).map(([k, v]) => [k, v.toFixed(2), pct(v, PF.critical_path_ns)]), [5, 2, 2], { center: true }),
  P("Memory accesses (instruction fetch and data read) take about half of the cycle, while the ALU itself takes only about 13%. An ADD instruction does not need the data-memory stage at all, yet it must still wait for the full cycle. This observation motivates the multi-cycle and pipelined organisations discussed in Chapter 8."),
  P("**Note:** a Vivado implementation on the Basys-3 (Artix-7, –1 speed grade) is expected to reach a similar or somewhat higher frequency. The exact Vivado numbers can be obtained in the lab with `fpga/vivado_build.tcl` and added to this table."),
);

// ===== 8 Performance
const rows = PF.rows;
C_.push(
  H1("8. Performance Analysis"),
  H2("8.1 Metrics of the single-cycle processor"),
  ...TABLE("Performance metrics", ["Metric", "Value", "How obtained"], [
    ["CPI", "1.00 (all instructions)", "Measured: cycles counted by testbench = instructions executed"],
    ["Clock period", `${PF.t_single_cycle_ns.toFixed(2)} ns`, "Post-route critical path (ECP5)"],
    ["Maximum frequency", `${fmax.toFixed(2)} MHz`, "nextpnr timing analysis"],
    ["Throughput", `${fmax.toFixed(1)} MIPS`, "IPC × f = 1 × Fmax"],
    ["Latency per instruction", `${PF.t_single_cycle_ns.toFixed(2)} ns`, "One cycle"],
  ], [2.2, 2.2, 5]),
  H2("8.2 Execution time of the test programs"),
  ...TABLE("Execution time at Fmax", ["Program", "Instructions", "Cycles (CPI 1)", "Time (ns)", "Time (µs)"], rows.map((r) => [r.program, String(r.instructions), String(r.sc_cycles), r.sc_time_ns.toFixed(1), (r.sc_time_ns / 1000).toFixed(2)]), [2, 1.5, 1.6, 1.4, 1.4], { center: true }),
  ...FIG("docs/perf/chart_instr_mix.png", "Dynamic instruction mix of the benchmark programs"),
  H2("8.3 Comparison with a baseline: multi-cycle implementation"),
  P(`As the baseline we use the classic **multi-cycle** implementation of the same ISA (Patterson & Hennessy), in which each instruction is split into steps of one short clock cycle each: LW takes 5 cycles, SW, R-type and ADDI take 4, and branches take 3. Its clock period is set by the **slowest single stage** plus the overhead of the extra state registers. Using the measured stage delays of Table 16, the slowest stage is the data-memory read (${Math.max(...Object.values(PF.stages)).toFixed(2)} ns); adding 0.6 ns for register clock-to-Q and setup gives **T = ${PF.t_multi_cycle_ns.toFixed(2)} ns**. The cycle counts of the baseline are computed exactly from the measured instruction mix of each program. (The baseline is an analytical model built from measured data; it is not implemented in RTL.)`),
  ...TABLE("Single-cycle vs. multi-cycle baseline", ["Program", "SC cycles", "SC time (ns)", "MC cycles", "MC CPI", "MC time (ns)", "SC speed-up"], rows.map((r) => [r.program, String(r.sc_cycles), r.sc_time_ns.toFixed(0), String(r.mc_cycles), r.mc_cpi.toFixed(2), r.mc_time_ns.toFixed(0), r.speedup_sc_vs_mc.toFixed(2) + "×"]), [1.8, 1.1, 1.3, 1.1, 1, 1.3, 1.3], { center: true }),
  ...FIG("docs/perf/chart_exec_time.png", "Execution time: single-cycle (this design) vs. multi-cycle baseline"),
  H3("Discussion"),
  B(`The single-cycle design is **1.02–1.27× faster** than the multi-cycle baseline on these programs. Its CPI is 4× lower, while its clock period is only about ${(PF.t_single_cycle_ns / PF.t_multi_cycle_ns).toFixed(1)}× longer.`),
  B("The advantage is smallest for branch-heavy code (branch_test: 1.02×), because branches are the cheapest instructions in the multi-cycle machine (3 cycles), and largest for memory-heavy code (mem_test: 1.27×)."),
  B("The multi-cycle design is close because the stage delays measured here are **well balanced**: the two memory stages and the register-file stage each take about 5–6 ns. With a slower memory (e.g. off-chip), the single-cycle clock would stretch for every instruction and the multi-cycle design would win."),
  B(`A **5-stage pipeline** (Project 3) keeps the short ${PF.t_multi_cycle_ns.toFixed(1)} ns clock *and* approaches CPI ≈ 1 by overlapping instructions. Ignoring hazards, it would be about ${(PF.t_single_cycle_ns / PF.t_multi_cycle_ns).toFixed(1)}× faster than this single-cycle design; hazard stalls and branch penalties (Projects 4 and 5) reduce this ideal figure.`),
);

// ===== 9 FPGA
C_.push(
  H1("9. FPGA Implementation and Demonstration"),
  H2("9.1 FPGA wrapper"),
  P("The module `fpga/fpga_top.v` connects the processor to a development board (Basys-3 pin constraints are provided in `fpga/basys3.xdc`):"),
  ...TABLE("FPGA board I/O", ["Board signal", "Basys-3 pin", "Function"], [
    ["clk", "W5 (100 MHz)", "System clock"],
    ["btn_rst", "U18 (centre button)", "Reset — restarts the program (synchronised to the clock)"],
    ["sw_fast", "V17 (SW0)", "1 = full speed; 0 = slow step (~6 instructions per second) via clock enable"],
    ["sw_show_pc", "V16 (SW1)", "0 = LEDs show a0 (x10, the program result); 1 = LEDs show the PC"],
    ["led[15:0]", "U16 … L1", "16 LEDs"],
  ], [2, 2.4, 5.6]),
  P("Running `full_test` at slow speed, the PC can be seen stepping on the LEDs (SW1 = 1); at the end the LEDs show **a0 = 62 = 0000 0000 0011 1110₂** (SW1 = 0). Note that the 100 MHz board clock is above the expected Fmax of the single-cycle path; for full-speed operation the clock should be reduced to about 40 MHz with a Clocking Wizard (MMCM), whereas slow-step mode is always safe because the clock-enable keeps the CPU path a multi-cycle path."),
  H2("9.2 Vivado flow (lab PC)"),
  ...CODE(["cd Single-Cycle-RV32I-Processor", "./scripts/run_all.sh                          # creates build/full_test.hex", "vivado -mode batch -source fpga/vivado_build.tcl", "# reports: fpga/vivado_out/utilization.rpt, timing.rpt, power.rpt", "# bitstream: fpga/vivado_out/fpga_top.bit  (program with Hardware Manager)"]),
  H2("9.3 Live demonstration procedure"),
  N("Run `./scripts/run_all.sh` — all unit tests, the seven programs and the stall tests print PASS."),
  N("Open a waveform: `surfer sim/cpu_full_test.vcd` (or `gtkwave sim/full_test.gtkw`) and walk through one LW, one SW and one taken branch."),
  N("Show the trace log `sim/cpu_full_test_trace.log` and the final register dump."),
  N("Run `./scripts/mutation_test.sh` to show the testbench detecting injected bugs."),
  N("Show the synthesis/timing reports (`./scripts/synth.sh`) and, if a board is available, the LEDs showing a0 = 62."),
);

// ===== 10 Conclusion
C_.push(
  H1("10. Conclusion and Future Work"),
  H2("10.1 Conclusion"),
  P(`A single-cycle RV32I processor supporting ADD, SUB, AND, OR, XOR, ADDI, LW, SW, BEQ and BNE was designed in modular, synthesizable Verilog using all the modules suggested in the specification. A self-checking verification environment with an independent golden model, ${unitTests} unit-level checks, seven test programs, a stall test and a mutation test (${killed}/${R.mutation.length} bugs detected) gives high confidence in its correctness. The processor achieves CPI = 1 and a post-route Fmax of ${fmax.toFixed(1)} MHz (${fmax.toFixed(1)} MIPS) on a Lattice ECP5, and needs only about ${X.total_luts} LUTs (${pct(X.total_luts, 20800)}) of an Artix-7 XC7A35T. The analysis of the measured critical path confirms the central lesson of single-cycle design: the clock period is dictated by the slowest instruction (LW), so faster instructions waste part of every cycle.`),
  H2("10.2 Future work"),
  B("Implement the remaining RV32I instructions (shifts, SLT/SLTU, immediate logic, LUI/AUIPC, JAL/JALR, byte/half-word loads and stores) and run the official riscv-tests suite."),
  B("Convert the design into a 5-stage pipeline with hazard detection, forwarding and branch prediction (Projects 3–5)."),
  B("Add a cache between the processor and a larger main memory (Projects 6–8)."),
  B("Run the Vivado flow on the Basys-3 board and add the Xilinx post-route timing to Chapter 7."),
);

// ===== 11 Individual contributions
const WORK = {
  "Alok Kumar": [
    "Coordinated the team, divided the work and maintained the GitHub repository.",
    "Designed the overall single-cycle datapath and drew the block diagram (Figure 2).",
    "Implemented the main control unit (`control_unit.v`), the ALU control (`alu_control.v`) and the shared constants (`defines.vh`).",
    "Integrated all modules in the top level `rv32i_cpu.v` and debugged the complete processor.",
    "Ran synthesis with Yosys and place-and-route with nextpnr (`scripts/synth.sh`) and analysed the critical path.",
    "Compiled and edited this report and the viva notes.",
  ],
  "Sharma Piyush": [
    "Designed the FPGA wrapper `fpga/fpga_top.v`: reset synchroniser, slow-step clock enable and LED display of a0 / PC.",
    "Wrote the Basys-3 pin constraints (`fpga/basys3.xdc`) and the Vivado batch flow (`fpga/vivado_build.tcl`).",
    "Prepared the presentation slides, the video script and the step-by-step live-demo script (`scripts/demo.sh`).",
  ],
  "Gourav Tanwar": [
    "Implemented the Program Counter (`pc.v`) with synchronous reset and clock enable.",
    "Implemented the 32 × 32 register file (`reg_file.v`) with two asynchronous read ports, one synchronous write port and x0 hard-wired to zero.",
    "Implemented the instruction memory (`instr_mem.v`) and data memory (`data_mem.v`) and the immediate generator (`imm_gen.v`) for the I, S and B formats.",
    "Wrote the unit testbenches `tb_reg_file.v` and `tb_imm_gen.v`.",
  ],
  "Saransh Singh Tomar": [
    "Implemented the ALU (`alu.v`) with the zero flag, the branch unit (`branch_unit.v`), the adders (`adder.v`) and the 2:1 multiplexers (`mux2.v`).",
    "Wrote the ALU unit testbench `tb_alu.v` (directed and random vectors) and the control-unit testbench `tb_control_unit.v`.",
    "Developed the mini RV32I assembler (`tools/assembler.py`) and wrote the seven test programs in `programs/`.",
  ],
  "Rachit Singh": [
    "Developed the golden reference model (`tools/iss.py`) used to generate the expected results.",
    "Wrote the self-checking system testbench `tb_rv32i_cpu.v` with coverage counters, trace log and the stall test, and the automation script `scripts/run_all.sh`.",
    "Designed the mutation test (`scripts/mutation_test.sh`) and produced the waveform images (`tools/vcd_plot.py`).",
    "Carried out the performance analysis and the multi-cycle baseline comparison (`tools/perf_analysis.py`).",
  ],
};
C_.push(
  H1("11. Team Members and Individual Contributions"),
  P(`The project was carried out by Team ${TEAM.name} (Group ${TEAM.group}) of the ${TEAM.programme} programme, ${TEAM.institute}. The work was divided by function so that each member owned a clear part of the design or its verification; all members reviewed the integrated design, took part in testing and contributed to the report and the presentation.`),
  ...TABLE("Team members and their roles", ["Name", "Roll No.", "Email", "Main responsibility"],
    TEAM.members.map((m) => [m.name, m.roll, m.email, m.role]), [2.1, 1.5, 3.5, 3.4], { size: 18 }),
);
TEAM.members.forEach((m, i) => {
  C_.push(H2(`11.${i + 1} ${m.name} (${m.roll})`), P(`**Role:** ${m.role}.`), ...WORK[m.name].map((w) => B(w)));
});
C_.push(
  H2(`11.${TEAM.members.length + 1} Collaboration`),
  P(`The source code, reports and slides are maintained in the shared GitHub repository ${TEAM.repo}, where each member pushed his part from his own account. Design decisions such as the control-signal encoding, the memory interface and the HALT convention were agreed in team meetings, and every change was checked with the complete regression suite (` + "`scripts/run_all.sh`" + `) before it was committed.`),
);
C_.push(
  H1("References"),
  N("A. Waterman and K. Asanović (eds.), *The RISC-V Instruction Set Manual, Volume I: Unprivileged ISA*, RISC-V International."),
  N("D. A. Patterson and J. L. Hennessy, *Computer Organization and Design: The Hardware/Software Interface, RISC-V Edition*, Morgan Kaufmann."),
  N("S. Harris and D. Harris, *Digital Design and Computer Architecture: RISC-V Edition*, Morgan Kaufmann."),
  N("Modern Computer Architecture – Verilog Projects, project list and common requirements (course document)."),
  N("Icarus Verilog, Yosys Open SYnthesis Suite, nextpnr and Surfer/GTKWave documentation."),
);

// ===== Appendices
C_.push(H1("Appendix A: Verilog Source Code"));
for (const f of rtlFiles) {
  C_.push(H3(`rtl/${f}`), ...CODE(fs.readFileSync(path.join(ROOT, "rtl", f), "utf8").replace(/\s+$/, "").split("\n"), 15), new Paragraph({ children: [] }));
}
C_.push(H1("Appendix B: Testbench and Test Program Listings"));
C_.push(H3("tb/tb_rv32i_cpu.v (system testbench)"), ...CODE(fs.readFileSync(path.join(ROOT, "tb/tb_rv32i_cpu.v"), "utf8").replace(/\s+$/, "").split("\n"), 14));
C_.push(H3("programs/full_test.s"), ...CODE(fs.readFileSync(path.join(ROOT, "programs/full_test.s"), "utf8").replace(/\s+$/, "").split("\n"), 15));
C_.push(H3("build/full_test.lst (assembled machine code)"), ...CODE(fs.readFileSync(path.join(ROOT, "build/full_test.lst"), "utf8").replace(/\s+$/, "").split("\n"), 15));
C_.push(
  H1("Appendix C: Reproducing the Results"),
  ...CODE([
    "# one-time setup (macOS)",
    "brew install icarus-verilog yosys surfer",
    "python3 -m venv .venv && .venv/bin/pip install matplotlib yowasp-nextpnr-ecp5",
    "",
    "cd Single-Cycle-RV32I-Processor",
    "./scripts/run_all.sh          # assemble, golden model, all simulations   -> sim/",
    "./scripts/mutation_test.sh    # testbench quality (mutation score)        -> sim/mutation_results.txt",
    "./scripts/make_waveforms.sh   # waveform images                           -> docs/waveforms/",
    "./scripts/synth.sh            # synthesis + place & route                 -> synth/reports/",
    "python3 tools/perf_analysis.py && python3 tools/collect_results.py",
    "surfer sim/cpu_full_test.vcd  # interactive waveform viewer",
  ]),
);

// ---------------------------------------------------------------- sections
const mkHeader = () => new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "8A949E", space: 4 } },
  children: [new TextRun({ text: "Team Black Coffee – Single-Cycle RV32I Processor in Verilog", size: 18, color: "555555" })] })] });
const mkFooter = () => new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Page ", size: 18 }), new TextRun({ children: [PageNumber.CURRENT], size: 18 })] })] });
const SECTIONS = [];
let cur = [], orient = "portrait";
const flush = (first) => {
  if (!cur.length) return;
  const land = orient === "landscape";
  SECTIONS.push({ properties: { page: { size: { width: 11906, height: 16838, orientation: land ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT },
    margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } }, titlePage: SECTIONS.length === 0 },
    headers: { default: mkHeader() }, footers: { default: mkFooter() }, children: cur });
  cur = [];
};
for (const el of C_) {
  if (el && el.SECTION) { flush(); orient = el.SECTION; } else cur.push(el);
}
flush();

// ---------------------------------------------------------------- document
const doc = new Document({
  creator: "Team Black Coffee",
  title: "Single-Cycle RV32I Processor - Project Report",
  styles: {
    default: { document: { run: { font: FONT, size: 24 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { font: FONT, size: 32, bold: true, color: "1F4E8C" }, paragraph: { spacing: { before: 240, after: 240 }, keepNext: true, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { font: FONT, size: 27, bold: true, color: "1F2D3D" }, paragraph: { spacing: { before: 240, after: 120 }, keepNext: true, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { font: FONT, size: 24, bold: true, italics: true }, paragraph: { spacing: { before: 160, after: 80 }, keepNext: true, outlineLevel: 2 } },
    ],
  },
  numbering: { config: [
    { reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
    { reference: "numbers", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
  ] },
  features: { updateFields: true },
  sections: SECTIONS,
});

Packer.toBuffer(doc).then((buf) => {
  const out = path.join(OUTDIR, "Detailed_Report_Team_Black_Coffee.docx");
  fs.writeFileSync(out, buf);
  console.log("wrote", out, `(${figNo} figures, ${tabNo} tables)`);
});
