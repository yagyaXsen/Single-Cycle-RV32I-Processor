# Prototype Video – 5-Minute Script (Team Black Coffee, Group B)

Rules from the evaluation: **maximum 5 minutes**, state the project idea,
**introduce all 5 members by name**, show the working prototype
(Verilog implementation, block diagram, simulation).

Each member presents his own part — this also shows individual contributions.
Target total: **4 min 40 s** (20 s safety margin).

| Time | Speaker | On screen | Length |
|---|---|---|---|
| 0:00 – 0:35 | Alok Kumar | Title slide → team slide | 35 s |
| 0:35 – 1:20 | Alok Kumar | Datapath slide | 45 s |
| 1:20 – 1:55 | Gourav Tanwar | `rtl/reg_file.v`, `rtl/imm_gen.v` | 35 s |
| 1:55 – 2:30 | Saransh Singh Tomar | `rtl/alu.v`, `programs/full_test.s` | 35 s |
| 2:30 – 3:30 | Rachit Singh | Terminal: `./scripts/demo.sh`, waveform | 60 s |
| 3:30 – 4:10 | Sharma Piyush | Synthesis slide, `fpga/fpga_top.v` | 40 s |
| 4:10 – 4:40 | Alok Kumar | Results slide → conclusion slide | 30 s |

---

## 1. Alok Kumar — introduction (0:00 – 0:35) · title slide, then team slide

> "Hello, we are Team Black Coffee, Group B. I am Alok Kumar, and my teammates
> are Sharma Piyush, Gourav Tanwar, Saransh Singh Tomar and Rachit Singh.
> Our project is a **single-cycle RV32I processor in Verilog**. It is a 32-bit
> RISC-V CPU that runs ten instructions — ADD, SUB, AND, OR, XOR, ADDI, load
> word, store word, BEQ and BNE — and every instruction finishes in one clock
> cycle."

## 2. Alok Kumar — architecture (0:35 – 1:20) · datapath slide

Point with the mouse while speaking:

> "This is our datapath. The program counter fetches the instruction from
> instruction memory. The control unit, which I designed, decodes the opcode and
> sets the control signals. The register file reads the operands, the ALU
> computes, data memory is used by load and store, and the write-back
> multiplexer writes the result. The next PC is PC plus four, or the branch
> target when a branch is taken."

## 3. Gourav Tanwar — storage modules (1:20 – 1:55) · editor

Show `rtl/reg_file.v`, then `rtl/imm_gen.v`.

> "I am Gourav Tanwar. I built the program counter, the memories, the register
> file and the immediate generator. The register file has 32 registers with two
> read ports and one write port, and register x0 is always zero. The immediate
> generator extracts and sign-extends the I, S and B-type immediates."

## 4. Saransh Singh Tomar — ALU and test programs (1:55 – 2:30) · editor

Show `rtl/alu.v`, then `programs/full_test.s`.

> "I am Saransh Singh Tomar. I built the ALU, which performs add, subtract,
> AND, OR and XOR and produces the zero flag used by branches, plus the branch
> unit. I also wrote our assembler and the test programs — this one uses all
> ten instructions and should finish with the value 62."

## 5. Rachit Singh — verification (2:30 – 3:30) · terminal + waveform

Run `./scripts/demo.sh` and press Enter through steps 1, 2 and 4
(cut the waiting in editing). Then show the waveform (Surfer or slide 12).

> "I am Rachit Singh, and I handled verification. A Python reference model
> calculates the correct result of every program, and our testbench compares
> all registers, all memory, the final PC and the instruction count.
> All tests pass, and register a0 is 62 as expected. To prove the testbench
> really catches bugs, we injected twelve deliberate bugs — it caught all
> twelve. In this waveform each column is one instruction: here the BNE is
> taken and the PC jumps back to the start of the loop."

## 6. Sharma Piyush — synthesis and FPGA (3:30 – 4:10) · synthesis slide, `fpga/fpga_top.v`

> "I am Sharma Piyush. I prepared the FPGA implementation for the Basys-3
> board — the top module shows the result on the LEDs and has a slow-step mode.
> After synthesis our processor uses only about 638 LUTs, three percent of the
> FPGA, and after place-and-route it runs at 44.4 megahertz."

## 7. Alok Kumar — results and conclusion (4:10 – 4:40) · performance slide, conclusion slide

> "Our CPU has a CPI of exactly one. The slowest instruction, load word, sets the
> clock period, which is why the next step is a pipelined design. Everything —
> code, report and results — is in our GitHub repository. Thank you."

---

## Recording tips

- Record each part separately (each member can record his own part on his own
  laptop with **Cmd + Shift + 5** on Mac, or **Win + G** / OBS on Windows),
  then join the clips in CapCut / iMovie / Clipchamp and check the total is
  **under 5:00**.
- Turn the camera on for the first few seconds of each part so the examiner
  sees who is speaking (optional but helps).
- Large font in the editor/terminal; speak slowly and clearly.

## Uploading

1. Upload to **YouTube as "Unlisted"** (or Google Drive with
   "Anyone with the link can view").
2. Put the link in `README.md` (section "Demo video") and in the submission form.
3. **Do not commit the video file to GitHub** — files over 100 MB are rejected.
