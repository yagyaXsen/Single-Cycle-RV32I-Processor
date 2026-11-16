// ============================================================================
// build_slides.js - generates docs/presentation/Presentation_Team_Black_Coffee.pptx
// Numbers come from docs/results.json. Speaker notes are included on every
// slide (View > Notes in PowerPoint) to help with the demo / viva.
// Run: NODE_PATH=../report_tools_node/node_modules node tools/build_slides.js <pptx-skill-dir>
// ============================================================================
const fs = require("fs");
const path = require("path");
const pptxgen = require("pptxgenjs");
const SKILL = process.argv[2];
const { applyTheme } = require(path.join(SKILL, "scripts/apply_theme.js"));

const ROOT = path.join(__dirname, "..");
const R = JSON.parse(fs.readFileSync(path.join(ROOT, "docs/results.json")));
const OUT = path.join(ROOT, "docs/presentation");
fs.mkdirSync(OUT, { recursive: true });

const THEME = {
  name: "RV32I Silicon",
  headFontFace: "Cambria",
  bodyFontFace: "Calibri",
  colors: {
    dk1: "1B232B", lt1: "FFFFFF", dk2: "0F2A3D", lt2: "EEF3F6",
    accent1: "D9822B", accent2: "1F6F8B", accent3: "3E9B6C", accent4: "8C5BA8",
    accent5: "7A8793", accent6: "C24A4A", hlink: "1F6F8B", folHlink: "8C5BA8",
  },
};
const HEX = THEME.colors;

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.33 x 7.5
pres.title = "Single-Cycle RV32I Processor";
pres.author = "Team Black Coffee";
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
const C = pres.SchemeColor;

// ---------------------------------------------------------------- layouts
pres.defineSlideMaster({
  title: "TITLE_DARK",
  background: { color: C.text2 },
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: 0.8, y: 2.0, w: 11.7, h: 1.9, fontSize: 44, bold: true, color: C.background1, valign: "bottom", fontFace: THEME.headFontFace }, text: "" } },
    { placeholder: { options: { name: "body", type: "body", x: 0.8, y: 4.1, w: 11.7, h: 1.8, fontSize: 18, color: "D6E2EA", valign: "top" }, text: "" } },
  ],
});
pres.defineSlideMaster({
  title: "CONTENT",
  background: { color: C.background1 },
  margin: [0.5, 0.5, 0.6, 0.5],
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: 0.6, y: 0.3, w: 12.1, h: 0.9, fontSize: 32, bold: true, color: C.text2, valign: "middle", fontFace: THEME.headFontFace }, text: "" } },
    { text: { text: "Single-Cycle RV32I Processor  |  Modern Computer Architecture – Project 1", options: { x: 0.6, y: 7.05, w: 9, h: 0.3, fontSize: 10, color: "7A8793" } } },
  ],
  slideNumber: { x: 12.2, y: 7.02, w: 0.6, h: 0.3, fontSize: 10, color: "7A8793", align: "right" },
});

// ---------------------------------------------------------------- helpers
const png = (rel) => { const b = fs.readFileSync(path.join(ROOT, rel)); return { path: path.join(ROOT, rel), w: b.readUInt32BE(16), h: b.readUInt32BE(20) }; };
function img(slide, rel, x, y, maxW, maxH, name) {
  const p = png(rel);
  let w = maxW, h = (maxW * p.h) / p.w;
  if (h > maxH) { h = maxH; w = (maxH * p.w) / p.h; }
  slide.addImage({ path: p.path, x: x + (maxW - w) / 2, y, w, h, altText: name, objectName: name });
}
function content(title, section) {
  const s = pres.addSlide({ masterName: "CONTENT", sectionTitle: section });
  s.addText(title, { placeholder: "title" });
  return s;
}
function card(s, x, y, w, h, head, body, color, name) {
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: 0.08, fill: { color: C.background2 }, line: { color: C.background2 }, objectName: name + " card" });
  s.addShape(pres.shapes.OVAL, { x: x + 0.25, y: y + 0.25, w: 0.5, h: 0.5, fill: { color }, line: { color }, objectName: name + " dot" });
  s.addText(head, { x: x + 0.9, y: y + 0.18, w: w - 1.05, h: 0.62, fontSize: 18, bold: true, color: C.text2, valign: "middle", margin: 0, isTextBox: true, objectName: name + " head" });
  s.addText(body, { x: x + 0.3, y: y + 0.95, w: w - 0.55, h: h - 1.1, fontSize: 16, color: C.text1, valign: "top", margin: 0, isTextBox: true, objectName: name + " body" });
}
function stat(s, x, y, w, big, label, color, name) {
  s.addText(big, { x, y, w, h: 1.0, fontSize: 48, bold: true, color, fontFace: THEME.headFontFace, margin: 0, isTextBox: true, objectName: name + " value" });
  s.addText(label, { x, y: y + 1.0, w, h: 0.75, fontSize: 14, color: C.text1, valign: "top", margin: 0, isTextBox: true, objectName: name + " label" });
}
function bullets(s, items, x, y, w, h, size = 16, name = "bullets") {
  s.addText(items.map((t, i) => ({ text: t, options: { bullet: true, breakLine: i < items.length - 1, paraSpaceAfter: 8 } })),
    { x, y, w, h, fontSize: size, color: C.text1, valign: "top", isTextBox: true, objectName: name });
}
const TH = (t) => ({ text: t, options: { bold: true, color: C.background1, fill: { color: C.text2 }, align: "center" } });

const X = R.xilinx, E = R.ecp5, PF = R.perf;
const fmax = E.fmax_mhz;
const unitTests = R.unit.reduce((a, u) => a + u.tests, 0);
const killed = R.mutation.filter((m) => m.status === "KILLED").length;

// ================================================================ 1 Title
pres.addSection({ title: "Introduction" });
let s = pres.addSlide({ masterName: "TITLE_DARK", sectionTitle: "Introduction" });
s.addText("Single-Cycle RV32I Processor in Verilog", { placeholder: "title" });
s.addText([
  { text: "Design, verification and FPGA synthesis", options: { breakLine: true } },
  { text: "Modern Computer Architecture – Project 1   |   Team Black Coffee (Group B)", options: { breakLine: true, fontSize: 15 } },
  { text: "Newton School of Technology, Rishihood University", options: { fontSize: 15 } },
], { placeholder: "body" });
s.addNotes("Introduce the team and the project: a 32-bit RISC-V processor that executes ten RV32I instructions, each in one clock cycle, written in Verilog, verified in simulation and synthesized for FPGAs.");


// ================================================================ 1b Team
s = content("Team Black Coffee", "Introduction");
const TEAM = [
  ["Alok Kumar", "2401010058", "Team lead: datapath design, control unit, integration, synthesis, report"],
  ["Sharma Piyush", "2401010437", "FPGA wrapper, Basys-3 constraints, Vivado flow, presentation and demo"],
  ["Gourav Tanwar", "2401010173", "PC, register file, instruction / data memory, immediate generator"],
  ["Saransh Singh Tomar", "2401010418", "ALU, branch unit, adders and MUXes, assembler, test programs"],
  ["Rachit Singh", "2401010364", "Golden model, system testbench, mutation test, waveforms, performance"],
];
const tw = 2.3, gap = 0.15;
TEAM.forEach(([name, roll, work], i) => {
  const x = 0.6 + i * (tw + gap), y = 1.55;
  const col = [C.accent1, C.accent2, C.accent3, C.accent4, C.text2][i];
  const ini = name.split(" ").filter(Boolean).map((w) => w[0]).slice(0, 2).join("");
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w: tw, h: 4.9, rectRadius: 0.08, fill: { color: C.background2 }, line: { color: C.background2 }, objectName: `member ${i + 1} card` });
  s.addShape(pres.shapes.OVAL, { x: x + tw / 2 - 0.5, y: y + 0.3, w: 1.0, h: 1.0, fill: { color: col }, line: { color: col }, objectName: `member ${i + 1} badge` });
  s.addText(ini, { x: x + tw / 2 - 0.5, y: y + 0.3, w: 1.0, h: 1.0, fontSize: 24, bold: true, color: C.background1, align: "center", valign: "middle", margin: 0, isTextBox: true, objectName: `member ${i + 1} initials` });
  s.addText(name, { x: x + 0.12, y: y + 1.45, w: tw - 0.24, h: 0.75, fontSize: 17, bold: true, color: C.text2, align: "center", valign: "middle", margin: 0, isTextBox: true, objectName: `member ${i + 1} name` });
  s.addText(roll, { x: x + 0.12, y: y + 2.2, w: tw - 0.24, h: 0.35, fontSize: 14, color: "5A6670", align: "center", margin: 0, isTextBox: true, objectName: `member ${i + 1} roll` });
  s.addText(work, { x: x + 0.15, y: y + 2.7, w: tw - 0.3, h: 2.05, fontSize: 14, color: C.text1, align: "left", valign: "top", margin: 0, isTextBox: true, objectName: `member ${i + 1} work` });
});
s.addNotes("Each member owned one part of the design or its verification; all of us tested the integrated CPU and worked on the report. Details are in Chapter 11 of the report.");

// ================================================================ 2 Objective
s = content("Objective: a working CPU for 10 RV32I instructions", "Introduction");
card(s, 0.6, 1.5, 3.9, 2.4, "Arithmetic & logic", "ADD, SUB, AND, OR, XOR\nrd ← rs1 op rs2", C.accent1, "alu");
card(s, 4.72, 1.5, 3.9, 2.4, "Immediate", "ADDI\nrd ← rs1 + sign-extended 12-bit constant", C.accent2, "imm");
card(s, 8.84, 1.5, 3.9, 2.4, "Memory", "LW, SW\nload / store a 32-bit word at rs1 + offset", C.accent3, "mem");
card(s, 0.6, 4.15, 3.9, 2.4, "Branch", "BEQ, BNE\njump to PC + offset if rs1 == / != rs2", C.accent4, "br");
card(s, 4.72, 4.15, 8.02, 2.4, "Single-cycle = CPI 1", "Every instruction is fetched, decoded, executed, uses memory and writes back within ONE clock cycle. State (PC, registers, memory) changes only at the rising clock edge.", C.text2, "sc");
s.addNotes("The project specification asks for these ten instructions. They are enough to write real programs: loops, arrays, Fibonacci. Single-cycle means CPI is exactly 1, but the clock must be slow enough for the slowest instruction.");

// ================================================================ 3 formats
s = content("RV32I instruction formats", "Introduction");
img(s, "docs/diagrams/instr_formats.png", 0.6, 1.4, 12.1, 4.4, "Instruction formats diagram");
s.addText("rs1, rs2 and rd sit in the same bit positions in every format, so registers are read while the instruction is still being decoded. The immediate's sign bit is always bit 31.",
  { x: 0.6, y: 6.0, w: 12.1, h: 0.8, fontSize: 15, color: C.text1, isTextBox: true, objectName: "formats note" });
s.addNotes("Four formats are needed: R for register operations, I for ADDI and LW, S for SW and B for branches. The B-type immediate is scrambled; the immediate generator reassembles it and adds a zero as bit 0.");

// ================================================================ 4 datapath
pres.addSection({ title: "Design" });
s = content("Datapath and control", "Design");
img(s, "docs/diagrams/datapath.png", 0.4, 1.25, 12.5, 5.75, "Single-cycle datapath block diagram");
s.addNotes("Walk left to right: PC addresses instruction memory; fields go to control, register file and immediate generator; the ALU computes; data memory for LW/SW; the write-back MUX picks ALU or memory; the PC MUX picks PC+4 or the branch target. Dashed blue lines are control signals.");

// ================================================================ 5 modules
s = content("Modular Verilog design: 13 RTL files", "Design");
img(s, "docs/diagrams/module_hierarchy.png", 0.6, 1.35, 12.1, 4.3, "Module hierarchy");
bullets(s, ["All 8 suggested modules + ALU control, branch unit, adders and 2:1 MUXes",
  "Asynchronous-read / synchronous-write memories; x0 hard-wired to zero",
  "Unsupported instructions are flagged illegal and executed as NOPs"], 0.6, 5.75, 12.1, 1.25, 15, "module notes");
s.addNotes("Each block of the diagram is its own module, instantiated in rv32i_cpu.v. The fpga_top wrapper adds LEDs, a reset synchroniser and a slow-step mode through the clock-enable input.");

// ================================================================ 6 control table
s = content("Control unit truth table", "Design");
const ct = [["Instr.", "RegWrite", "ALUSrc", "MemRead", "MemWrite", "MemToReg", "Branch", "ALUOp", "ALU op"],
  ["R-type", "1", "0", "0", "0", "0", "0", "10", "funct3/7"], ["ADDI", "1", "1", "0", "0", "0", "0", "11", "ADD"],
  ["LW", "1", "1", "1", "0", "1", "0", "00", "ADD"], ["SW", "0", "1", "0", "1", "x", "0", "00", "ADD"],
  ["BEQ/BNE", "0", "0", "0", "0", "x", "1", "01", "SUB"], ["illegal", "0", "0", "0", "0", "0", "0", "00", "–"]];
s.addTable(ct.map((r, i) => r.map((c) => (i === 0 ? TH(c) : { text: c, options: { align: "center", fill: { color: i % 2 ? C.background1 : C.background2 } } }))),
  { x: 0.6, y: 1.5, w: 12.1, colW: [1.6, 1.3, 1.2, 1.3, 1.3, 1.4, 1.2, 1.2, 1.6], fontSize: 16, color: C.text1, border: { type: "solid", pt: 0.75, color: "B8C4CE" }, rowH: 0.5, objectName: "control table" });
s.addText("Two-level decoding: the main control produces ALUOp; ALU control combines it with funct3 and funct7[5] to pick ADD, SUB, AND, OR or XOR. Verified exhaustively by tb_control_unit (18 encodings).",
  { x: 0.6, y: 5.35, w: 12.1, h: 1.0, fontSize: 15, color: C.text1, isTextBox: true, objectName: "control note" });
s.addNotes("Be ready to explain any row. Example: LW sets ALUSrc=1 so the ALU adds the immediate, MemRead=1 to read memory, MemToReg=1 so memory data is written back, RegWrite=1.");

// ================================================================ 7 LW path
s = content("LW: the longest path sets the clock", "Design");
const steps = [["1", "Fetch", "PC → instruction memory"], ["2", "Decode", "read rs1, make immediate"], ["3", "Execute", "ALU: rs1 + imm = address"], ["4", "Memory", "read data memory"], ["5", "Write-back", "MUX → register rd"]];
steps.forEach(([n, h, b], i) => {
  const x = 0.6 + i * 2.48;
  s.addShape(pres.shapes.OVAL, { x: x + 0.75, y: 1.55, w: 0.75, h: 0.75, fill: { color: C.accent1 }, line: { color: C.accent1 }, objectName: `step ${n} circle` });
  s.addText(n, { x: x + 0.75, y: 1.55, w: 0.75, h: 0.75, fontSize: 22, bold: true, color: C.background1, align: "center", valign: "middle", margin: 0, isTextBox: true, objectName: `step ${n} number` });
  s.addText(h, { x, y: 2.4, w: 2.25, h: 0.45, fontSize: 18, bold: true, color: C.text2, align: "center", margin: 0, isTextBox: true, objectName: `step ${n} head` });
  s.addText(b, { x, y: 2.85, w: 2.25, h: 0.7, fontSize: 14, color: C.text1, align: "center", margin: 0, isTextBox: true, objectName: `step ${n} body` });
});
const st = Object.entries(PF.stages);
s.addChart(pres.charts.BAR, st.map(([k, v]) => ({ name: k, labels: ["LW path"], values: [Number(v.toFixed(2))] })), {
  x: 0.6, y: 3.75, w: 12.1, h: 2.2, barDir: "bar", barGrouping: "stacked", chartColors: [HEX.accent2, "6FA8C0", HEX.accent3, HEX.accent1, HEX.accent5],
  showValue: true, dataLabelPosition: "ctr", dataLabelColor: "FFFFFF", dataLabelFontSize: 12, dataLabelFormatCode: "0.0\" ns\"", dataLabelFontFace: "+mn-lt",
  showLegend: true, legendPos: "b", legendFontSize: 11, legendFontFace: "+mn-lt", catAxisHidden: true,
  valAxisLabelColor: "5A6670", valAxisLabelFontSize: 11, valAxisLabelFontFace: "+mn-lt", valGridLine: { color: "E1E7EC", size: 0.5 }, catGridLine: { style: "none" },
  showTitle: true, title: `Measured critical path ${PF.critical_path_ns.toFixed(2)} ns  →  Fmax ${fmax.toFixed(1)} MHz (ECP5, post-route)`, titleFontSize: 13, titleColor: HEX.dk2, titleFontFace: "+mn-lt", objectName: "critical path chart",
});
s.addText("An ADD does not need the memory stage, yet it must wait the full cycle — the key drawback of single-cycle designs.",
  { x: 0.6, y: 6.1, w: 12.1, h: 0.6, fontSize: 15, italic: true, color: C.text2, isTextBox: true, objectName: "lw note" });
s.addNotes("This chart comes from the real place-and-route timing report. Memory accesses take about half of the cycle; the ALU only about 13%.");

// ================================================================ 8 verification method
pres.addSection({ title: "Verification" });
s = content("Self-checking verification against a golden model", "Verification");
img(s, "docs/diagrams/verification_flow.png", 0.6, 1.3, 12.1, 3.6, "Verification flow diagram");
stat(s, 0.8, 5.05, 3.6, String(unitTests), "unit-level checks (ALU, register file, immediate generator, control)", C.accent2, "unit");
stat(s, 4.85, 5.05, 3.6, "7 / 7", "programs pass: 32 registers, 256 memory words, final PC and count compared", C.accent3, "cpu");
stat(s, 8.9, 5.05, 3.6, `${killed} / ${R.mutation.length}`, "injected bugs detected by the testbench (mutation test)", C.accent1, "mut");
s.addNotes("Nothing is checked by eye. A Python instruction-set simulator gives the expected state; the Verilog testbench compares automatically and prints PASS or FAIL.");

// ================================================================ 9 test results
s = content("Test programs and results", "Verification");
const desc = { alu_test: "ALU + ADDI corner cases, x0 writes", mem_test: "LW/SW offsets, first/last word", branch_test: "taken / not taken, loops", illegal_test: "unsupported encodings → NOP", array_sum: "benchmark, a0 = 39", fibonacci: "benchmark, a0 = 4181", full_test: "all 10 instructions, a0 = 62" };
const tr = [["Program", "What it checks", "Instructions", "CPI", "Result", "Stall test"].map(TH)];
R.cpu.forEach((c, i) => tr.push([c.program, desc[c.program], String(c.instructions), "1.00", c.result, R.stall[i].result].map((t, j) => ({ text: t, options: { align: j === 1 || j === 0 ? "left" : "center", bold: j === 4, color: j === 4 || j === 5 ? HEX.accent3 : HEX.dk1, fill: { color: i % 2 ? C.background2 : C.background1 } } }))));
s.addTable(tr, { x: 0.6, y: 1.45, w: 12.1, colW: [1.9, 4.6, 1.6, 1.0, 1.4, 1.6], fontSize: 15, color: C.text1, border: { type: "solid", pt: 0.75, color: "B8C4CE" }, rowH: 0.48, objectName: "results table" });
s.addText("Stall test: the clock-enable is pulled low on random cycles; the processor must freeze and still produce identical results.",
  { x: 0.6, y: 5.6, w: 12.1, h: 0.8, fontSize: 15, color: C.text1, isTextBox: true, objectName: "stall note" });
s.addNotes("Every instruction and both outcomes of both branches are covered. Total dynamic coverage is in the report, Table 12.");

// ================================================================ 10 mutation
s = content("Is the testbench strong enough? Mutation testing", "Verification");
const mt = [["#", "Deliberately injected bug", "Detected by"].map(TH)];
R.mutation.forEach((m, i) => mt.push([String(m.id), m.bug, m.detected_by.split(" ").slice(0, 3).join(", ") + (m.detected_by.split(" ").length > 3 ? ", …" : "")].map((t, j) => ({ text: t, options: { align: j === 0 ? "center" : "left", fill: { color: i % 2 ? C.background2 : C.background1 } } }))));
s.addTable(mt, { x: 0.6, y: 1.4, w: 8.3, colW: [0.5, 3.6, 4.2], fontSize: 12, color: C.text1, border: { type: "solid", pt: 0.5, color: "B8C4CE" }, rowH: 0.36, objectName: "mutation table" });
stat(s, 9.3, 1.6, 3.4, `${killed}/${R.mutation.length}`, "bugs caught", C.accent1, "mut score");
bullets(s, ["Found 3 gaps in the first testbench — all fixed:", "wrong branch target hidden by memory wrap-around → compare final PC", "illegal write of 0 into a 0 register → preload markers", "clock-enable never tested → stall test"], 9.3, 3.4, 3.5, 3.3, 13, "mutation lessons");
s.addNotes("A testbench that never fails proves nothing. Each mutant is the real RTL with one bug. All are detected now; the first version missed three, which is how the testbench was improved.");

// ================================================================ 11-12 waveforms
s = content("Waveform: branch loop (BNE backward)", "Verification");
img(s, "docs/waveforms/wave_branch_test_2.png", 0.4, 1.3, 12.5, 5.6, "Branch loop waveform");
s.addNotes("Each column is one instruction. On every BNE the zero flag is 0, so PCSrc = 1 and next PC jumps back to 0x3C. On the last iteration zero = 1 and the loop exits to 0x44.");
s = content("Waveform: array-sum loop (LW, ADD, ADDI, BNE)", "Verification");
img(s, "docs/waveforms/wave_array_sum_loop.png", 0.4, 1.3, 12.5, 5.6, "Array sum waveform");
s.addNotes("MemRead is high on LW, the ADD writes a0, and regs[10] (a0) shows the running sum 3, 4, 8 one cycle later because registers are written at the clock edge.");

// ================================================================ 13 synthesis
pres.addSection({ title: "Results" });
s = content("Synthesis results", "Results");
stat(s, 0.8, 1.5, 3.7, String(X.total_luts), `LUTs on Artix-7 XC7A35T (${(100 * X.total_luts / X.lut_avail).toFixed(1)}% of Basys-3)`, C.accent2, "luts");
stat(s, 4.85, 1.5, 3.7, String(X.ffs), "flip-flops (PC + FPGA wrapper)", C.accent3, "ffs");
stat(s, 8.9, 1.5, 3.7, `${fmax.toFixed(1)} MHz`, "post-route Fmax on Lattice ECP5", C.accent1, "fmax");
const sy = [["Target / tool", "Logic", "Memory", "Timing"].map(TH),
  ["Artix-7 (Yosys synth_xilinx)", `${X.logic_luts} LUTs, ${X.carry4} CARRY4`, `${X.lutram_luts} LUTs as RAM (reg file + 1 KB data)`, "use Vivado in lab"],
  ["ECP5 LFE5U-25F (nextpnr P&R)", `${E.TRELLIS_COMB[0]} LUT4, ${E.TRELLIS_FF[0]} FF`, `${E.TRELLIS_RAMW[0]} RAM cells + ${E.DP16KD[0]} block RAM (ROM)`, `${fmax.toFixed(2)} MHz`]];
s.addTable(sy.map((r, i) => i === 0 ? r : r.map((t) => ({ text: t, options: { fill: { color: C.background2 } } }))), { x: 0.6, y: 4.0, w: 12.1, colW: [3.3, 2.9, 3.9, 2.0], fontSize: 14, color: C.text1, border: { type: "solid", pt: 0.75, color: "B8C4CE" }, rowH: 0.5, objectName: "synthesis table" });
s.addText("Open-source flow: Yosys + nextpnr (scripts/synth.sh). Vivado script and Basys-3 constraints are included for the lab PC.",
  { x: 0.6, y: 5.75, w: 12.1, h: 0.7, fontSize: 14, color: C.text1, isTextBox: true, objectName: "synth note" });
s.addNotes("The design is tiny: about 3% of the Basys-3 FPGA. The memories dominate. The frequency is limited by the long single-cycle path, not by the logic size.");

// ================================================================ 14 performance
s = content("Performance vs. a multi-cycle baseline", "Results");
const rows = PF.rows;
s.addChart(pres.charts.BAR, [
  { name: `Single-cycle (CPI 1, ${PF.t_single_cycle_ns.toFixed(1)} ns)`, labels: rows.map((r) => r.program), values: rows.map((r) => Math.round(r.sc_time_ns)) },
  { name: `Multi-cycle (CPI ≈ 4, ${PF.t_multi_cycle_ns.toFixed(1)} ns, model)`, labels: rows.map((r) => r.program), values: rows.map((r) => Math.round(r.mc_time_ns)) },
], { x: 0.5, y: 1.3, w: 8.1, h: 5.5, barDir: "col", barGrouping: "clustered", chartColors: [HEX.dk2, HEX.accent1],
  showValue: true, dataLabelPosition: "outEnd", dataLabelFontSize: 10, dataLabelColor: "5A6670", dataLabelFontFace: "+mn-lt",
  showLegend: true, legendPos: "b", legendFontSize: 12, legendFontFace: "+mn-lt",
  catAxisLabelColor: "5A6670", catAxisLabelFontSize: 11, catAxisLabelFontFace: "+mn-lt", valAxisLabelColor: "5A6670", valAxisLabelFontSize: 11, valAxisLabelFontFace: "+mn-lt",
  valGridLine: { color: "E1E7EC", size: 0.5 }, catGridLine: { style: "none" },
  showTitle: true, title: "Execution time (ns)", titleFontSize: 14, titleColor: HEX.dk2, titleFontFace: "+mn-lt", objectName: "execution time chart" });
bullets(s, [`CPI = 1, ${fmax.toFixed(1)} MIPS at Fmax`, "Single-cycle is 1.02–1.27× faster than multi-cycle here", "Reason: stage delays are balanced (~5–6 ns each)", `A 5-stage pipeline would keep the ${PF.t_multi_cycle_ns.toFixed(1)} ns clock with CPI ≈ 1: up to ~${(PF.t_single_cycle_ns / PF.t_multi_cycle_ns).toFixed(1)}× faster (Project 3)`], 8.9, 1.5, 3.9, 5.2, 15, "performance takeaways");
s.addNotes("The multi-cycle numbers are an analytical model built from the measured stage delays and the measured instruction mix; it is not implemented in RTL. Be clear about that if asked.");

// ================================================================ 15 FPGA demo
s = content("FPGA demo (Basys-3) and live demonstration", "Results");
card(s, 0.6, 1.5, 5.9, 4.9, "Board mapping", "SW0: full speed / slow step (~6 instr/s)\nSW1: LEDs show a0 or the PC\nCentre button: reset\n16 LEDs: full_test ends with a0 = 62 = 0000 0000 0011 1110\n\nfpga/fpga_top.v, basys3.xdc, vivado_build.tcl", C.accent2, "board");
card(s, 6.8, 1.5, 5.9, 4.9, "Live demo steps", "1. ./scripts/run_all.sh → all PASS\n2. surfer sim/cpu_full_test.vcd → walk LW, SW, branch\n3. trace log + final register dump\n4. ./scripts/mutation_test.sh → 12/12\n5. ./scripts/synth.sh → resources and Fmax", C.accent1, "demo");
s.addNotes("If no board is available, the simulation demo covers everything the evaluation asks for. With a board, run the Vivado script and show the LEDs.");

// ================================================================ 16 conclusion
pres.addSection({ title: "Conclusion" });
s = pres.addSlide({ masterName: "TITLE_DARK", sectionTitle: "Conclusion" });
s.addText("Conclusion", { placeholder: "title" });
s.addText([
  { text: `Working single-cycle RV32I CPU: 10 instructions, CPI 1, ${fmax.toFixed(1)} MHz, ~${X.total_luts} LUTs`, options: { bullet: true, breakLine: true } },
  { text: `Verified: ${unitTests} unit checks, 7 programs, stall test, ${killed}/${R.mutation.length} mutants killed`, options: { bullet: true, breakLine: true } },
  { text: "Next: full RV32I, 5-stage pipeline with forwarding and branch prediction", options: { bullet: true, breakLine: true } },
  { text: "Thank you — questions?", options: { bold: true, color: "F2B36B" } },
], { placeholder: "body" });
s.addNotes("Summarise and invite questions. Typical viva questions: why is LW the slowest? Why is x0 hard-wired? What happens on an unsupported instruction? How does the B-type immediate work?");

(async () => {
  const file = path.join(OUT, "Presentation_Team_Black_Coffee.pptx");
  await pres.writeFile({ fileName: file });
  await applyTheme(file, THEME);
  console.log("wrote", file);
})();
