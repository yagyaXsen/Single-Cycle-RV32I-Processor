// ============================================================================
// build_ieee_report.js - IEEE conference-format (two-column) project report.
// Sections: Abstract, Introduction, Literature Review, Proposed Solution,
// Results and Discussion, Individual Contributions, Conclusion, References.
// Numbers are read from docs/results.json.
// Run: NODE_PATH=../report_tools_node/node_modules node tools/build_ieee_report.js
// ============================================================================
const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, ImageRun, Table, TableRow, TableCell, AlignmentType,
  WidthType, ShadingType, BorderStyle, SectionType, LevelFormat,
} = require("docx");

const ROOT = path.join(__dirname, "..");
const R = JSON.parse(fs.readFileSync(path.join(ROOT, "docs/results.json")));
const OUT = path.join(ROOT, "docs/report/IEEE_Report_Team_Black_Coffee.docx");

const X = R.xilinx, E = R.ecp5, PF = R.perf;
const fmax = E.fmax_mhz;
const unitTests = R.unit.reduce((a, u) => a + u.tests, 0);
const killed = R.mutation.filter((m) => m.status === "KILLED").length;
const pct = (a, b) => ((100 * a) / b).toFixed(1) + "%";

const F = "Times New Roman";
const PAGE_W = 12240, MARG_LR = 900, GAP = 360;
const FULL_W = PAGE_W - 2 * MARG_LR;           // 10440 DXA = 7.25 in
const COL_W = (FULL_W - GAP) / 2;              // 5040 DXA = 3.5 in
const TEAM = [
  ["Alok Kumar", "2401010058", "alok.kumar2024@nst.rishihood.edu.in"],
  ["Sharma Piyush", "2401010437", "sharma.piyush2024@nst.rishihood.edu.in"],
  ["Gourav Tanwar", "2401010173", "gourav.tanwar2024@nst.rishihood.edu.in"],
  ["Saransh Singh Tomar", "2401010418", "saransh.tomar2024@nst.rishihood.edu.in"],
  ["Rachit Singh", "2401010364", "rachit.singh2024@nst.rishihood.edu.in"],
];

// ---------------------------------------------------------------- text helpers
function runs(text, base = {}) {
  const out = [];
  const re = /(\*\*[^*]+\*\*|_[^_]+_|`[^`]+`|\[\d+(?:[,–-]\s?\d+)*\])/g;
  let last = 0, m;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(new TextRun({ text: text.slice(last, m.index), ...base }));
    const t = m[0];
    if (t.startsWith("**")) out.push(new TextRun({ text: t.slice(2, -2), bold: true, ...base }));
    else if (t.startsWith("_")) out.push(new TextRun({ text: t.slice(1, -1), italics: true, ...base }));
    else if (t.startsWith("`")) out.push(new TextRun({ text: t.slice(1, -1), font: "Courier New", size: (base.size || 20) - 2 }));
    else out.push(new TextRun({ text: t, ...base }));
    last = m.index + t.length;
  }
  if (last < text.length) out.push(new TextRun({ text: text.slice(last), ...base }));
  return out;
}
const P = (t, o = {}) => new Paragraph({ alignment: AlignmentType.JUSTIFIED, indent: { firstLine: 202 }, spacing: { after: 0, line: 240 }, children: runs(t), ...o });
const P0 = (t) => P(t, { indent: { firstLine: 0 } });
const B = (t) => new Paragraph({ numbering: { reference: "bul", level: 0 }, alignment: AlignmentType.JUSTIFIED, spacing: { after: 0, line: 240 }, children: runs(t) });
const H1 = (t) => new Paragraph({ alignment: AlignmentType.CENTER, keepNext: true, spacing: { before: 200, after: 100 }, children: [new TextRun({ text: t, smallCaps: true, size: 20 })] });
const H2 = (t) => new Paragraph({ keepNext: true, spacing: { before: 100, after: 40 }, children: [new TextRun({ text: t, italics: true, size: 20 })] });

let figN = 0, tabN = 0;
const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];
function png(rel) { const b = fs.readFileSync(path.join(ROOT, rel)); return { data: b, w: b.readUInt32BE(16), h: b.readUInt32BE(20) }; }
function FIG(rel, caption, widthIn) {
  const p = png(rel); figN++;
  const w = widthIn * 96, h = (w * p.h) / p.w;
  return [
    new Paragraph({ alignment: AlignmentType.CENTER, keepNext: true, spacing: { before: 120, after: 40 },
      children: [new ImageRun({ type: "png", data: p.data, transformation: { width: w, height: h }, altText: { title: caption, description: caption, name: path.basename(rel) } })] }),
    new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: { after: 120 }, children: [new TextRun({ text: `Fig. ${figN}.  `, size: 16 }), ...runs(caption, { size: 16 })] }),
  ];
}
const thin = { style: BorderStyle.SINGLE, size: 4, color: "000000" };
const none = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
function TABLE(caption, headers, rows, widths, totalW = COL_W) {
  tabN++;
  const sum = widths.reduce((a, b) => a + b, 0);
  const W = widths.map((x) => Math.floor((x * totalW) / sum));
  W[W.length - 1] += totalW - W.reduce((a, b) => a + b, 0);
  const cell = (t, i, head, last) => new TableCell({
    width: { size: W[i], type: WidthType.DXA }, margins: { top: 30, bottom: 30, left: 60, right: 60 },
    borders: { top: head ? thin : none, bottom: head || last ? thin : none, left: none, right: none },
    children: [new Paragraph({ alignment: i === 0 ? AlignmentType.LEFT : AlignmentType.CENTER, children: runs(String(t), { size: 16, bold: head || undefined }) })],
  });
  return [
    new Paragraph({ alignment: AlignmentType.CENTER, keepNext: true, spacing: { before: 120, after: 0 }, children: [new TextRun({ text: `TABLE ${ROMAN[tabN - 1]}`, size: 16 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, keepNext: true, spacing: { after: 60 }, children: [new TextRun({ text: caption, smallCaps: true, size: 16 })] }),
    new Table({ width: { size: totalW, type: WidthType.DXA }, columnWidths: W, alignment: AlignmentType.CENTER,
      rows: [new TableRow({ tableHeader: true, children: headers.map((h, i) => cell(h, i, true, false)) }),
        ...rows.map((r, ri) => new TableRow({ cantSplit: true, children: r.map((c, i) => cell(c, i, false, ri === rows.length - 1)) }))] }),
    new Paragraph({ spacing: { after: 100 }, children: [] }),
  ];
}

// ---------------------------------------------------------------- title block (1 column)
const title = [
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 }, children: [new TextRun({ text: "Design and Verification of a Single-Cycle RV32I Processor in Verilog", size: 48 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 160 }, children: [new TextRun({ text: "Team Black Coffee (Group B) — Modern Computer Architecture, Project 1", italics: true, size: 20 })] }),
];
const authorCell = ([name, roll, email], w) => new TableCell({
  width: { size: w, type: WidthType.DXA }, borders: { top: none, bottom: none, left: none, right: none },
  margins: { top: 40, bottom: 80, left: 40, right: 40 },
  children: [
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: name, size: 22 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `Roll No. ${roll}`, italics: true, size: 18 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "B.Tech CS & AI, Newton School of Technology", size: 18 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Rishihood University, Sonipat, India", size: 18 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: email, size: 16 })] }),
  ] });
const w3 = Math.floor(FULL_W / 3);
title.push(
  new Table({ width: { size: FULL_W, type: WidthType.DXA }, columnWidths: [w3, w3, FULL_W - 2 * w3], borders: { top: none, bottom: none, left: none, right: none, insideHorizontal: none, insideVertical: none },
    rows: [new TableRow({ children: TEAM.slice(0, 3).map((m, i) => authorCell(m, i === 2 ? FULL_W - 2 * w3 : w3)) })] }),
  new Table({ width: { size: FULL_W, type: WidthType.DXA }, columnWidths: [w3, w3], alignment: AlignmentType.CENTER, borders: { top: none, bottom: none, left: none, right: none, insideHorizontal: none, insideVertical: none },
    rows: [new TableRow({ children: TEAM.slice(3).map((m) => authorCell(m, w3)) })] }),
  new Paragraph({ spacing: { after: 120 }, children: [] }),
);

// ---------------------------------------------------------------- body part 1 (2 columns)
const A = [];
A.push(
  new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: { after: 80 }, children: [
    new TextRun({ text: "Abstract", bold: true, italics: true, size: 18 }), new TextRun({ text: "—", bold: true, size: 18 }),
    ...runs(`This paper presents the design, implementation and verification of a compact single-cycle 32-bit RISC-V processor written in synthesizable Verilog. The processor executes ten instructions of the RV32I base integer instruction set — ADD, SUB, AND, OR, XOR, ADDI, LW, SW, BEQ and BNE — each in exactly one clock cycle. The design is built from modular components: program counter, instruction memory, control unit, 32 × 32-bit register file, immediate generator, ALU, data memory and write-back multiplexer. A self-checking verification environment compares the processor against an independent golden reference model on seven test programs, checking all registers, all data-memory words, the final program counter and the instruction count; ${unitTests} additional unit-level checks, a clock-enable stall test and a mutation test that detected ${killed} of ${R.mutation.length} injected bugs confirm its correctness. Synthesized for a Xilinx Artix-7 FPGA the processor needs about ${X.total_luts} LUTs (${pct(X.total_luts, X.lut_avail)}), and after place-and-route on a Lattice ECP5 it reaches ${fmax.toFixed(1)} MHz, i.e. ${fmax.toFixed(1)} MIPS at CPI = 1. The measured critical path confirms that the load instruction limits the clock of a single-cycle design.`, { bold: true, size: 18 })] }),
  new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: { after: 120 }, children: [
    new TextRun({ text: "Index Terms", bold: true, italics: true, size: 18 }), new TextRun({ text: "—RISC-V, RV32I, single-cycle processor, datapath, control unit, Verilog HDL, FPGA, functional verification, mutation testing.", bold: true, size: 18 })] }),

  H1("I. Introduction"),
  P("A processor executes a program by repeating the fetch–decode–execute cycle. The simplest hardware that implements this cycle is the **single-cycle processor**, in which every instruction is fetched, decoded, executed, given memory access and written back within one clock period. Although slower than pipelined designs, it exposes most clearly how an instruction set architecture (ISA) is mapped onto a datapath and its control logic, and it is the starting point for multi-cycle, pipelined and multicore processors [4], [5]."),
  P("RISC-V is an open, royalty-free ISA originating at UC Berkeley [1]–[3]. Its base integer set RV32I has few, regular instruction formats, which makes it well suited for compact and educational hardware. The objective of this project, as defined in the course specification, is to **design and verify a single-cycle RISC-V processor in Verilog that executes a selected subset of RV32I**, to synthesize it and to evaluate its performance against a baseline."),
  P("The main contributions of this work are:"),
  B("a modular, synthesizable Verilog implementation of a single-cycle RV32I processor for ADD, SUB, AND, OR, XOR, ADDI, LW, SW, BEQ and BNE;"),
  B("a self-checking verification flow with an assembler, an independent instruction-set simulator as golden model, unit and system testbenches, a stall test and mutation testing;"),
  B("FPGA synthesis with resource, timing and critical-path analysis, and a quantitative comparison with a multi-cycle baseline."),
  P("Section II reviews related work, Section III describes the proposed design, Section IV presents results, Section V lists the individual contributions and Section VI concludes the paper."),

  H1("II. Literature Review"),
  H2("A. The RISC-V Instruction Set"),
  P("Asanović and Patterson argued that instruction sets should be free and open, and proposed RISC-V as a clean-slate, extensible ISA [2]. Waterman's dissertation explains its design choices — for example a hard-wired zero register, fixed 32-bit instructions and register specifiers in the same bit positions in every format — which simplify decoding and allow the register file to be read in parallel with decoding [3]. The ISA manual defines RV32I with 32 general-purpose registers and six instruction formats [1]; our subset uses the R, I, S and B formats."),
  H2("B. Processor Microarchitectures"),
  P("Patterson and Hennessy [4] and Harris and Harris [5] present three classic organisations of the same ISA. In a **single-cycle** design every instruction takes one long cycle whose period is set by the slowest instruction (the load). A **multi-cycle** design splits execution into shorter steps, so simple instructions take fewer cycles but CPI rises to about four. A **pipelined** design overlaps instructions to approach CPI ≈ 1 with a short clock, at the cost of hazard detection, forwarding and branch prediction [6]. We implement the single-cycle organisation and use the multi-cycle one as a baseline."),
  H2("C. Open-Source RISC-V Cores"),
  P("Many open RV32 implementations exist. PicoRV32 is a size-optimised multi-cycle core [7]; SERV is a bit-serial core that trades speed for minimal area [8]; Ibex is an industrial-quality two-stage pipelined core [9]. These cores target real products and are therefore complex. A single-cycle core with a small, clearly documented subset, as in this work, is better suited to studying the datapath and control relationship that the course focuses on."),
  H2("D. Verification of Processors"),
  P("Processors are commonly verified by comparing them with a golden instruction-set simulator such as Spike [10] and by running directed ISA test suites such as riscv-tests [11]. We follow the same reference-model approach with a lightweight Python simulator. To measure the quality of the testbench itself we use **mutation testing**, introduced by DeMillo, Lipton and Sayward [12]: small faults are injected into the design and a good test suite must detect them."),
  H2("E. Open-Source FPGA Tool Flows"),
  P("Yosys and nextpnr form an open-source flow from Verilog to bitstream for commercial FPGAs [13]. Together with the Icarus Verilog simulator [14] they allow the full RTL → simulation → synthesis → timing flow on any operating system, which we use alongside a Vivado script for the Xilinx Basys-3 board."),

  H1("III. Proposed Solution"),
  H2("A. Supported Instruction Subset"),
  P("The processor implements the ten instructions of Table I. With them real programs can be written: ADDI loads constants and steps loop counters, BEQ with x0 acts as an unconditional jump and `beq x0, x0, 0` (a jump to itself) marks the end of a program (HALT). Unsupported encodings are detected and executed as no-operations."),
  ...TABLE("Supported RV32I instructions", ["Instr.", "Fmt", "Operation"], [
    ["ADD / SUB", "R", "rd ← rs1 ± rs2"], ["AND / OR / XOR", "R", "rd ← rs1 op rs2"], ["ADDI", "I", "rd ← rs1 + imm"],
    ["LW", "I", "rd ← M[rs1 + imm]"], ["SW", "S", "M[rs1 + imm] ← rs2"], ["BEQ / BNE", "B", "if (rs1 =/≠ rs2) PC ← PC + imm"],
  ], [1.5, 0.6, 2.4]),
  H2("B. Datapath"),
  P("Fig. 1 shows the datapath. The PC addresses a 256 × 32-bit instruction memory. The register specifiers are sent to a register file with two asynchronous read ports and one synchronous write port, while the immediate generator sign-extends the I-, S- or B-type immediate. A multiplexer selects rs2 or the immediate as the second ALU operand. The ALU result is either written back or used as the address of a 256 × 32-bit data memory; the write-back multiplexer selects the ALU result or the loaded word. A separate adder computes the branch target, and the next-PC multiplexer chooses between PC + 4 and the target. All state elements update on the rising clock edge, so each instruction completes in one cycle."),
);

// ---------------------------------------------------------------- full-width figure 1
const FULL1 = FIG("docs/diagrams/datapath.png", "Datapath and control of the proposed single-cycle RV32I processor. Solid lines are 32-bit data paths; dashed lines are control signals.", 6.2);

// ---------------------------------------------------------------- body part 2 (2 columns)
const Bp = [];
Bp.push(
  H2("C. Control Unit"),
  P("A two-level decoder generates the control signals. The main control unit decodes the opcode into RegWrite, ALUSrc, MemRead, MemWrite, MemToReg, Branch, a 2-bit ALUOp and the immediate format; an ALU-control block combines ALUOp with funct3 and funct7[5] to select ADD, SUB, AND, OR or XOR (Table II). A branch unit asserts PCSrc when Branch = 1 and the ALU zero flag matches the condition (zero for BEQ, not zero for BNE)."),
  ...TABLE("Main control signals", ["Instr.", "RegW", "ALUSrc", "MemR", "MemW", "M2R", "Br", "ALUOp"], [
    ["R-type", "1", "0", "0", "0", "0", "0", "10"], ["ADDI", "1", "1", "0", "0", "0", "0", "11"], ["LW", "1", "1", "1", "0", "1", "0", "00"],
    ["SW", "0", "1", "0", "1", "x", "0", "00"], ["BEQ/BNE", "0", "0", "0", "0", "x", "1", "01"], ["illegal", "0", "0", "0", "0", "0", "0", "00"],
  ], [1.3, 0.7, 0.8, 0.7, 0.7, 0.6, 0.5, 0.8]),
  H2("D. RTL Implementation"),
  P("The design consists of 13 Verilog-2001 files with one module per block: `pc`, `instr_mem`, `control_unit`, `alu_control`, `reg_file`, `imm_gen`, `alu`, `branch_unit`, `adder`, `mux2`, `data_mem` and the top level `rv32i_cpu`. Register x0 is hard-wired to zero; a clock-enable input allows the CPU to be paused without a second clock domain; debug ports expose the PC, the write-back bus and the store bus to the testbench and the FPGA wrapper."),
  H2("E. Verification Methodology"),
  P("Test programs are written in RISC-V assembly and translated by a project-specific assembler. An independent Python instruction-set simulator executes the same machine code and produces the expected final state. The system testbench runs the processor until HALT and automatically compares **all 32 registers, all 256 data-memory words, the final PC and the number of executed instructions**. It also records instruction coverage, an execution trace and a VCD waveform. Unit testbenches check the ALU (5 010 directed and random vectors), the register file, the immediate generator and the full control truth table. A stall test pulls the clock enable low on pseudo-random cycles, and a mutation test injects twelve single faults into copies of the RTL."),
  H2("F. FPGA Implementation"),
  P("An FPGA wrapper connects the processor to a Basys-3 board: a push button resets the CPU, one switch selects full speed or a slow-step mode of about six instructions per second (through the clock enable), another selects whether the 16 LEDs show register a0 or the PC. Pin constraints and a Vivado batch script are provided; open-source synthesis with Yosys and place-and-route with nextpnr were used for the reported results."),

  H1("IV. Results and Discussion"),
  H2("A. Functional Verification"),
  P(`All four unit testbenches (${unitTests} checks) and all seven programs pass (Table III); the stall test, with ${R.stall.reduce((a, s) => a + s.stall_cycles, 0)} frozen cycles in total, produces identical results. The benchmarks give the expected answers: the array sum is 39, the 20th Fibonacci number F(19) is 4181, and the program using all ten instructions ends with a0 = 62. Every instruction and both outcomes of both branch types were exercised.`),
  P(`The mutation test detected **${killed} of ${R.mutation.length}** injected bugs, including a BNE that behaves like BEQ, a writable x0, a wrong S-type immediate and a register write that ignores the clock enable. It also revealed three weaknesses of an earlier testbench — a wrong branch target hidden by instruction-memory wrap-around, an illegal write of zero into a zero register and an untested clock enable — which were fixed by comparing the final PC and instruction count, preloading marker values and adding the stall test.`),
);
const FULL2 = FIG("docs/waveforms/wave_branch_test_2.png", "Simulation waveform of a backward BNE loop. Each column is one instruction; when the branch is taken, PCSrc = 1 and the next PC returns to the loop start (0x3C).", 6.9);

const Cp = [];
Cp.push(
  ...TABLE("System test results", ["Program", "Instr.", "CPI", "Result"], R.cpu.map((c) => [c.program, c.instructions, "1.00", c.result]), [2, 1, 1, 1]),
  H2("B. Synthesis Results"),
  P(`Table IV summarises synthesis. On the Artix-7 XC7A35T of the Basys-3 board the complete FPGA design uses ${X.total_luts} LUTs, of which ${X.lutram_luts} implement the register file and data memory as distributed RAM, and ${X.ffs} flip-flops. After place-and-route on a Lattice ECP5 LFE5U-25F the maximum frequency is **${fmax.toFixed(2)} MHz**.`),
  ...TABLE("FPGA resource utilisation", ["Resource", "Used", "Avail.", "Util."], [
    ["Artix-7 LUTs", X.total_luts, "20 800", pct(X.total_luts, 20800)], ["Artix-7 flip-flops", X.ffs, "41 600", pct(X.ffs, 41600)],
    ["Artix-7 CARRY4", X.carry4, "8 150", pct(X.carry4, 8150)], ["ECP5 LUT4", E.TRELLIS_COMB[0], E.TRELLIS_COMB[1], pct(...E.TRELLIS_COMB)],
    ["ECP5 RAM cells", E.TRELLIS_RAMW[0], E.TRELLIS_RAMW[1], pct(...E.TRELLIS_RAMW)], ["ECP5 Fmax", `${fmax.toFixed(1)} MHz`, "–", "–"],
  ], [1.8, 1, 1, 0.8]),
  H2("C. Critical Path"),
  P(`The post-route critical path is ${PF.critical_path_ns.toFixed(2)} ns and is exactly the load path predicted by theory (Fig. 3): instruction fetch, register read, address addition, data-memory read and write-back into the register file. The two memory accesses take about half of the cycle and the ALU only 13 %. Faster instructions such as ADD do not use the data memory, yet must wait for the full cycle — the fundamental inefficiency of the single-cycle organisation.`),
  ...FIG("docs/perf/chart_critical_path.png", `Breakdown of the measured ${PF.critical_path_ns.toFixed(1)} ns critical path (ECP5, post-route).`, 3.4),
  H2("D. Performance and Baseline Comparison"),
  P(`The processor achieves CPI = 1, i.e. ${fmax.toFixed(1)} MIPS. As a baseline we model a multi-cycle implementation of the same ISA [4] (LW 5 cycles, SW/R-type/ADDI 4, branches 3) whose clock period is the slowest measured stage plus register overhead, ${PF.t_multi_cycle_ns.toFixed(2)} ns. Using the measured instruction mix of each program (Table V), the single-cycle design is 1.02–1.27× faster. The advantage is small because the measured stage delays are well balanced; a five-stage pipeline would keep the short clock and approach CPI ≈ 1, giving up to about ${(PF.t_single_cycle_ns / PF.t_multi_cycle_ns).toFixed(1)}× speed-up before hazard penalties.`),
  ...TABLE("Execution time: single-cycle vs. multi-cycle", ["Program", "SC (ns)", "MC CPI", "MC (ns)", "Speed-up"],
    PF.rows.filter((r) => ["mem_test", "branch_test", "array_sum", "fibonacci", "full_test"].includes(r.program))
      .map((r) => [r.program, r.sc_time_ns.toFixed(0), r.mc_cpi.toFixed(2), r.mc_time_ns.toFixed(0), r.speedup_sc_vs_mc.toFixed(2) + "×"]), [1.6, 0.9, 0.9, 0.9, 1]),
  H2("E. Limitations"),
  P("Only ten RV32I instructions are supported, memories are 1 KB each and word-aligned, and the multi-cycle baseline is an analytical model built from measured stage delays rather than a second RTL implementation. Vivado post-route results for the Basys-3 are to be added in Phase II."),

  H1("V. Individual Contributions"),
  P("The work was divided by function so that each member owned one part of the design or its verification (Table VI); all members tested the integrated processor and contributed to this report. Each member committed his part to the shared GitHub repository from his own account."),
  ...TABLE("Contributions of team members", ["Member", "Contribution"], [
    ["Alok Kumar (2401010058)", "Team lead; datapath design, control unit and ALU control, top-level integration, synthesis and timing analysis, report"],
    ["Sharma Piyush (2401010437)", "FPGA wrapper, Basys-3 constraints, Vivado flow, presentation and demo script"],
    ["Gourav Tanwar (2401010173)", "Program counter, register file, instruction and data memories, immediate generator and their testbenches"],
    ["Saransh Singh Tomar (2401010418)", "ALU, branch unit, adders and multiplexers, ALU and control testbenches, assembler and test programs"],
    ["Rachit Singh (2401010364)", "Golden reference model, system testbench, stall and mutation tests, waveforms, performance analysis"],
  ], [1.5, 3]),

  H1("VI. Conclusion and Future Work"),
  P(`A single-cycle RV32I processor for ten instructions was designed in modular, synthesizable Verilog and verified with a self-checking, reference-model-based environment whose strength was demonstrated by mutation testing (${killed}/${R.mutation.length}). The processor uses about ${pct(X.total_luts, 20800)} of an Artix-7 XC7A35T and runs at ${fmax.toFixed(1)} MHz on an ECP5 with CPI = 1. The measured critical path confirms that the load instruction dictates the clock of a single-cycle design. Future work in Phase II includes the full RV32I instruction set with the official riscv-tests suite [11], a five-stage pipeline with hazard detection, forwarding and branch prediction, and Vivado implementation on the Basys-3 board.`),

  H1("Acknowledgment"),
  P("The authors thank the instructors and teaching assistants of Modern Computer Architecture at Newton School of Technology, Rishihood University, and the developers of the open-source tools used in this work. Source code: https://github.com/yagyaXsen/Single-Cycle-RV32I-Processor."),

  H1("References"),
);
const REFS = [
  "A. Waterman and K. Asanović, Eds., _The RISC-V Instruction Set Manual, Volume I: Unprivileged ISA_, Document Version 20191213. RISC-V Foundation, 2019.",
  "K. Asanović and D. A. Patterson, “Instruction sets should be free: The case for RISC-V,” EECS Dept., Univ. of California, Berkeley, Tech. Rep. UCB/EECS-2014-146, 2014.",
  "A. Waterman, “Design of the RISC-V instruction set architecture,” Ph.D. dissertation, EECS Dept., Univ. of California, Berkeley, 2016.",
  "D. A. Patterson and J. L. Hennessy, _Computer Organization and Design RISC-V Edition: The Hardware Software Interface_. Cambridge, MA, USA: Morgan Kaufmann, 2017.",
  "S. L. Harris and D. Harris, _Digital Design and Computer Architecture: RISC-V Edition_. Cambridge, MA, USA: Morgan Kaufmann, 2021.",
  "J. L. Hennessy and D. A. Patterson, _Computer Architecture: A Quantitative Approach_, 6th ed. Cambridge, MA, USA: Morgan Kaufmann, 2017.",
  "C. Wolf, “PicoRV32 – A size-optimized RISC-V CPU.” [Online]. Available: https://github.com/YosysHQ/picorv32",
  "O. Kindgren, “SERV – the SErial RISC-V CPU.” [Online]. Available: https://github.com/olofk/serv",
  "lowRISC, “Ibex RISC-V core.” [Online]. Available: https://github.com/lowRISC/ibex",
  "RISC-V International, “Spike RISC-V ISA simulator.” [Online]. Available: https://github.com/riscv-software-src/riscv-isa-sim",
  "RISC-V International, “riscv-tests.” [Online]. Available: https://github.com/riscv-software-src/riscv-tests",
  "R. A. DeMillo, R. J. Lipton, and F. G. Sayward, “Hints on test data selection: Help for the practicing programmer,” _Computer_, vol. 11, no. 4, pp. 34–41, Apr. 1978.",
  "D. Shah, E. Hung, C. Wolf, S. Bazanski, D. Gisselquist, and M. Milanović, “Yosys+nextpnr: An open source framework from Verilog to bitstream for commercial FPGAs,” in _Proc. IEEE 27th Annu. Int. Symp. Field-Programmable Custom Computing Machines (FCCM)_, 2019.",
  "S. Williams, “Icarus Verilog.” [Online]. Available: https://steveicarus.github.io/iverilog/",
  "_IEEE Standard for Verilog Hardware Description Language_, IEEE Std 1364-2005, 2006.",
];
REFS.forEach((r, i) => Cp.push(new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: { after: 30 }, indent: { left: 360, hanging: 360 },
  children: [new TextRun({ text: `[${i + 1}]\t`, size: 16 }), ...runs(r, { size: 16 })] })));

// ---------------------------------------------------------------- document
const page = { size: { width: PAGE_W, height: 15840 }, margin: { top: 1080, bottom: 1440, left: MARG_LR, right: MARG_LR } };
const two = { count: 2, space: GAP, equalWidth: true };
const doc = new Document({
  creator: "Team Black Coffee", title: "Design and Verification of a Single-Cycle RV32I Processor in Verilog",
  styles: { default: { document: { run: { font: F, size: 20 } } } },
  numbering: { config: [{ reference: "bul", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 360, hanging: 200 } } } }] }] },
  sections: [
    { properties: { page }, children: title },
    { properties: { page, type: SectionType.CONTINUOUS, column: two }, children: A },
    { properties: { page, type: SectionType.CONTINUOUS }, children: FULL1 },
    { properties: { page, type: SectionType.CONTINUOUS, column: two }, children: Bp },
    { properties: { page, type: SectionType.CONTINUOUS }, children: FULL2 },
    { properties: { page, type: SectionType.CONTINUOUS, column: two }, children: Cp },
  ],
});
Packer.toBuffer(doc).then((b) => { fs.writeFileSync(OUT, b); console.log("wrote", OUT, `(${figN} figures, ${tabN} tables)`); });
