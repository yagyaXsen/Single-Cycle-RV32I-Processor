# Viva / Demo Preparation Notes

Simple explanations of the project and answers to the questions examiners
usually ask. Read this together with the datapath diagram
(`docs/diagrams/datapath.png`).

## The project in 30 seconds

"We, Team Black Coffee, designed a 32-bit RISC-V processor in Verilog that runs 10 instructions:
ADD, SUB, AND, OR, XOR, ADDI, LW, SW, BEQ and BNE. It is single-cycle, so
every instruction finishes in one clock cycle and the CPI is 1. We verified it
with a self-checking testbench against a Python reference model on 7 programs,
and synthesized it: it uses about 638 LUTs on an Artix-7 and runs at 44 MHz on
an ECP5 FPGA. The slowest instruction, LW, decides the clock period."

## How one instruction executes (all in one cycle)

1. **Fetch:** the PC gives the address; the instruction memory outputs the instruction.
2. **Decode:** the control unit looks at the opcode and sets the control signals;
   the register file reads rs1 and rs2; the immediate generator makes the constant.
3. **Execute:** the ALU adds, subtracts, ANDs, ORs or XORs.
4. **Memory:** LW reads data memory, SW writes it.
5. **Write-back:** the write-back MUX picks the ALU result or the memory data and
   writes it to rd. The PC becomes PC+4, or the branch target if a branch is taken.

PC, registers and memory only change at the **rising clock edge**; everything
else is combinational logic that settles during the cycle.

## Likely questions and answers

**Why is it called single-cycle? What is its CPI?**
Each instruction completes in one clock cycle, so CPI = 1. The clock period must
be long enough for the slowest instruction.

**Which instruction is the slowest and why?**
LW. It uses every block in series: instruction memory → register read → ALU
(address) → data memory → write-back MUX → register file. The measured critical
path is 22.5 ns (Fmax 44.4 MHz).

**What is the disadvantage of a single-cycle design?**
Fast instructions (like ADD or BEQ) must wait for the full long cycle. Multi-cycle
and pipelined designs fix this. A 5-stage pipeline could use a ~6.5 ns clock with
CPI close to 1.

**Why is x0 always zero? How did you implement it?**
The RISC-V ISA defines x0 as hard-wired zero (useful for `li`, `mv`, `j`, comparing
with zero). The register file ignores writes when rd = 0 and returns 0 when reading x0.

**What does the immediate generator do?**
It picks out the constant bits from the instruction (in different places for
I, S and B format) and sign-extends them to 32 bits. For branches it adds a 0 as
bit 0 because targets are multiples of 2.

**Why is the S-type immediate split into two parts?**
So that rs1, rs2 and rd are always in the same bit positions in every format, which
lets the register file start reading before decoding is finished.

**How do BEQ and BNE work in your design?**
The ALU computes rs1 − rs2. If the result is zero, the operands are equal. The branch
unit sets PCSrc = zero for BEQ and PCSrc = not zero for BNE. A separate adder
computes PC + offset, and the PC MUX chooses it when PCSrc = 1.

**What are ALUSrc, MemToReg, RegWrite?**
ALUSrc: second ALU input is rs2 (0) or the immediate (1).
MemToReg: write the ALU result (0) or memory data (1) into rd.
RegWrite: allow writing rd. See the control truth table in the report.

**Why two levels of control (control unit + ALU control)?**
The main control only needs the opcode to produce a 2-bit ALUOp; the ALU control
then uses funct3/funct7 for R-type instructions. This keeps each decoder small.

**Why asynchronous read but synchronous write for the memories?**
In a single cycle the data must be available in the same cycle (asynchronous read),
while all state changes happen together at the clock edge (synchronous write).

**What happens if the CPU gets an instruction it does not support?**
The control unit flags it `illegal` and turns off all writes, so it behaves like a
NOP and the PC moves to the next instruction. `illegal_test` checks this.

**How did you verify the processor?**
Programs are written in assembly, assembled by my assembler, and run on both a
Python reference model and the Verilog CPU. The testbench compares all 32 registers,
all 256 memory words, the final PC and the instruction count, and prints PASS/FAIL.
Unit testbenches check the ALU (5010 vectors), register file, immediate generator
and control unit.

**How do you know your testbench is good?**
Mutation testing: I injected 12 different bugs into copies of the design and the
testbench caught all 12. It also exposed 3 weaknesses in my first testbench, which
I fixed.

**What is the clock enable (`en`) for?**
It lets the CPU pause without creating a second clock. The FPGA demo uses it for a
slow-step mode, and the stall test checks that the CPU freezes correctly.

**How did you synthesize without Vivado?**
With the open-source tools Yosys (synthesis) and nextpnr (place and route) on a
Lattice ECP5, which gave the real Fmax, plus a Yosys Artix-7 resource estimate.
A Vivado script for the Basys-3 is included for the lab.

**How does the multi-cycle comparison work?**
Multi-cycle CPI: LW 5, SW/R/ADDI 4, branch 3 cycles. Its clock is the slowest
single stage (~6.5 ns). Using the measured instruction mix, single-cycle is
1.02–1.27× faster on these programs because the stages are well balanced. This
baseline is a calculation, not built in Verilog — say so if asked.

## Demo script (5 minutes)

1. `./scripts/run_all.sh` → show everything PASS.
2. `surfer sim/cpu_full_test.vcd` → show one LW, one SW, one taken BNE.
3. `cat sim/cpu_full_test.log` → final registers, coverage, CPI.
4. `./scripts/mutation_test.sh` → 12/12 bugs caught.
5. Show `docs/diagrams/datapath.png` and the synthesis numbers.
