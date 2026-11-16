# Single-Cycle RV32I Processor (Verilog)

**Modern Computer Architecture – Project 1** · RISC-V / CPU Datapath · Level: Intermediate+

A compact single-cycle 32-bit RISC-V processor that executes
**ADD, SUB, AND, OR, XOR, ADDI, LW, SW, BEQ, BNE**. Each instruction finishes
in one clock cycle (CPI = 1). The processor is fully verified against a golden
reference model and synthesized for FPGA.

| Result | Value |
|---|---|
| Unit tests (ALU, register file, immediate generator, control) | 5109 checks, all PASS |
| CPU test programs (golden-model comparison) | 7 / 7 PASS (plus 7 / 7 in stall mode) |
| Mutation test (deliberate bugs caught by the testbench) | 12 / 12 |
| Xilinx Artix-7 XC7A35T (Basys-3) | ~638 LUTs (3.1%), 100 FF |
| Lattice ECP5 post-route Fmax | 44.4 MHz (critical path 22.5 ns, the LW path) |
| CPI / throughput | 1.00 / 44.4 MIPS |

## Project report and demo video

| | |
|---|---|
| **IEEE project report** | [docs/report/IEEE_Report_Team_Black_Coffee.pdf](docs/report/IEEE_Report_Team_Black_Coffee.pdf) |
| Detailed technical report | [docs/report/Detailed_Report_Team_Black_Coffee.pdf](docs/report/Detailed_Report_Team_Black_Coffee.pdf) |
| Presentation | [docs/presentation/Presentation_Team_Black_Coffee.pdf](docs/presentation/Presentation_Team_Black_Coffee.pdf) |
| **Prototype demo video** | _link will be added after upload_ |

---

## Deliverables checklist (from the project PDF)

| Required by the PDF | Where it is |
|---|---|
| Working RV32I processor (RTL) | `rtl/` (13 files, top = `rtl/rv32i_cpu.v`) |
| Suggested modules: PC, Instruction Memory, Decoder/Control Unit, 32×32 Register File, Immediate Generator, ALU, Data Memory, Write-Back MUX | `rtl/pc.v`, `instr_mem.v`, `control_unit.v` (+ `alu_control.v`), `reg_file.v`, `imm_gen.v`, `alu.v`, `data_mem.v`, `mux2.v` (`u_wb_mux`) |
| Testbench | `tb/tb_rv32i_cpu.v` (system) + `tb/tb_alu.v`, `tb_reg_file.v`, `tb_imm_gen.v`, `tb_control_unit.v` |
| Instruction test programs | `programs/*.s` → assembled to `build/*.hex` / `build/*.lst` |
| Simulation waveforms | `sim/cpu_*.vcd` (open with Surfer/GTKWave) and images in `docs/waveforms/` |
| Synthesis / resource report and max frequency | `synth/reports/` (`xilinx_stat.txt`, `ecp5_stat.txt`, `nextpnr_ecp5.log`, `critical_path.txt`) |
| Performance observations / quantitative metric | `docs/perf/` (CPI, execution time, MIPS, charts) |
| Comparison against a baseline | `docs/perf/performance.md`, report Chapter 8 (multi-cycle baseline) |
| Block diagram | `docs/diagrams/datapath.png` (+ hierarchy, formats, verification flow) |
| FPGA implementation (if available) | `fpga/fpga_top.v`, `fpga/basys3.xdc`, `fpga/vivado_build.tcl` |
| **Final technical report** | `docs/report/Detailed_Report_Team_Black_Coffee.docx` and `.pdf` |
| **Presentation for the live demo** | `docs/presentation/Presentation_Team_Black_Coffee.pptx` (with speaker notes) |

## Team Black Coffee (Group B)

Newton School of Technology, Rishihood University — B.Tech CS & AI

| Name | Roll No. | Main responsibility |
|---|---|---|
| Alok Kumar | 2401010058 | Team lead – datapath design, control unit, integration, synthesis, report |
| Sharma Piyush | 2401010437 | FPGA wrapper, Basys-3 constraints, Vivado flow, presentation and demo |
| Gourav Tanwar | 2401010173 | PC, register file, instruction / data memory, immediate generator |
| Saransh Singh Tomar | 2401010418 | ALU, branch unit, adders and MUXes, assembler, test programs |
| Rachit Singh | 2401010364 | Golden model, system testbench, mutation test, waveforms, performance |

Details of each member's work: report Chapter 11.

---

## Folder structure

```
Single-Cycle-RV32I-Processor/
├── rtl/            synthesizable Verilog (the processor)
├── tb/             testbenches
├── programs/       RISC-V assembly test programs (.s)
├── tools/          assembler, golden model (ISS), plotting, report/slide generators
├── scripts/        run_all.sh, mutation_test.sh, make_waveforms.sh, synth.sh
├── fpga/           Basys-3 top, constraints, Vivado batch script
├── build/          generated: .hex machine code, listings, expected results
├── sim/            generated: logs, traces, .vcd waveforms, results_summary.txt
├── synth/          generated: synthesis / place & route reports
└── docs/           diagrams, waveforms, performance charts, report, slides
```

## How to run

One-time setup (macOS):

```bash
brew install icarus-verilog yosys surfer
```

```bash
python3 -m venv ../.venv && ../.venv/bin/pip install matplotlib yowasp-nextpnr-ecp5
```

Run everything (from this folder):

```bash
./scripts/run_all.sh
```

```bash
./scripts/mutation_test.sh
```

```bash
./scripts/make_waveforms.sh
```

```bash
./scripts/synth.sh
```

View a waveform interactively:

```bash
surfer sim/cpu_full_test.vcd
```

On a lab PC with GTKWave use `gtkwave sim/full_test.gtkw` (signals pre-arranged).
On a lab PC with Vivado: `vivado -mode batch -source fpga/vivado_build.tcl`.

Write your own program: create `programs/myprog.s` (see `tools/assembler.py`
for the syntax; end it with `halt`) and add its name to `PROGRAMS` in
`scripts/run_all.sh`.

Regenerate report and slides after changes:
`python3 tools/perf_analysis.py && python3 tools/collect_results.py`, then
`NODE_PATH=../report_tools_node/node_modules node tools/build_report.js`,
then `./scripts/export_pdf.sh` (needs LibreOffice) to make the PDF with an
up-to-date table of contents. Slides: `tools/build_slides.js`.

## Test programs

| Program | Checks |
|---|---|
| `alu_test` | ADD/SUB/AND/OR/XOR/ADDI, negative numbers, immediate limits, writes to x0 |
| `mem_test` | LW/SW with positive/negative/zero offsets, first & last word, load-use |
| `branch_test` | BEQ/BNE taken & not taken, forward/backward, loops, unconditional jump |
| `illegal_test` | unsupported instructions behave as NOPs |
| `memcpy_test` | copy an 8-word array with LW/SW and verify it (a0 = 1) |
| `array_sum` | benchmark: sum of a 10-element array (a0 = 39) |
| `fibonacci` | benchmark: first 20 Fibonacci numbers (a0 = 4181) |
| `full_test` | all 10 instructions together (a0 = 62); used for synthesis / FPGA |

See `docs/VIVA_NOTES.md` for a simple explanation of the design and likely viva questions.

