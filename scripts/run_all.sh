#!/usr/bin/env bash
# ============================================================================
# run_all.sh - one command to build and verify the whole project
#
#   1. assemble every program in programs/          -> build/*.hex, *.lst
#   2. run the golden reference model (ISS)          -> build/*_exp_*.hex
#   3. run the 4 unit testbenches                    -> sim/tb_*.log / .vcd
#   4. run the CPU testbench on every program        -> sim/cpu_<prog>.log/.vcd
#   5. write sim/results_summary.txt
#
# Usage (from the project folder):  ./scripts/run_all.sh
# Needs: python3, iverilog/vvp (brew install icarus-verilog)
# ============================================================================
set -u
cd "$(dirname "$0")/.."
mkdir -p build sim

PY=python3
PROGRAMS="alu_test mem_test branch_test illegal_test memcpy_test array_sum fibonacci full_test"
SUMMARY=sim/results_summary.txt
: > "$SUMMARY"
fail=0

echo "== 1/2  Assemble programs and generate golden results =="
for p in $PROGRAMS; do
    $PY tools/assembler.py programs/$p.s -o build/$p.hex -l build/$p.lst || exit 1
    $PY tools/iss.py build/$p.hex --out-prefix build/$p     || exit 1
done

echo
echo "== 3  Unit testbenches =="
for tb in tb_alu tb_reg_file tb_imm_gen tb_control_unit; do
    iverilog -g2005 -I rtl -o sim/$tb.vvp tb/$tb.v rtl/*.v || exit 1
    vvp -n sim/$tb.vvp > sim/$tb.log 2>&1
    line=$(grep -E "^$tb: (PASS|FAIL)" sim/$tb.log)
    echo "  $line"
    echo "$line" >> "$SUMMARY"
    echo "$line" | grep -q PASS || fail=1
done

echo
echo "== 4  CPU system testbench (each program) =="
for p in $PROGRAMS; do
    iverilog -g2005 -I rtl -o sim/cpu_$p.vvp \
        -DPROG_HEX=\"build/$p.hex\" \
        -DEXP_REGS=\"build/${p}_exp_regs.hex\" \
        -DEXP_DMEM=\"build/${p}_exp_dmem.hex\" \
        -DEXP_PC=\"build/${p}_exp_pc.hex\" \
        -DVCD_FILE=\"sim/cpu_$p.vcd\" \
        -DLOG_FILE=\"sim/cpu_${p}_trace.log\" \
        tb/tb_rv32i_cpu.v rtl/*.v || exit 1
    vvp -n sim/cpu_$p.vvp > sim/cpu_$p.log 2>&1
    res=$(grep "^RESULT" sim/cpu_$p.log)
    perf=$(grep "^Performance" sim/cpu_$p.log | sed 's/Performance: //')
    printf "  %-14s %-8s %s\n" "$p" "$(echo $res | awk '{print $2}')" "$perf"
    printf "cpu %-14s %s | %s\n" "$p" "$res" "$perf" >> "$SUMMARY"
    echo "$res" | grep -q PASS || fail=1
done

echo
echo "== 5  CPU stall test (random clock-enable pauses, results must not change) =="
for p in $PROGRAMS; do
    iverilog -g2005 -I rtl -o sim/stall_$p.vvp -DSTALL_TEST \
        -DPROG_HEX=\"build/$p.hex\" \
        -DEXP_REGS=\"build/${p}_exp_regs.hex\" \
        -DEXP_DMEM=\"build/${p}_exp_dmem.hex\" \
        -DEXP_PC=\"build/${p}_exp_pc.hex\" \
        -DVCD_FILE=\"sim/stall_$p.vcd\" \
        -DLOG_FILE=\"sim/stall_${p}_trace.log\" \
        tb/tb_rv32i_cpu.v rtl/*.v || exit 1
    vvp -n sim/stall_$p.vvp > sim/stall_$p.log 2>&1
    res=$(grep "^RESULT" sim/stall_$p.log)
    st=$(grep "^Stall test" sim/stall_$p.log | sed 's/Stall test : //')
    printf "  %-14s %-8s %s\n" "$p" "$(echo $res | awk '{print $2}')" "$st"
    printf "stall %-14s %s | %s\n" "$p" "$res" "$st" >> "$SUMMARY"
    echo "$res" | grep -q PASS || fail=1
    rm -f sim/stall_$p.vcd
done

echo
if [ $fail -eq 0 ]; then
    echo "ALL TESTS PASSED" | tee -a "$SUMMARY"
else
    echo "SOME TESTS FAILED - see sim/*.log" | tee -a "$SUMMARY"
    exit 1
fi
