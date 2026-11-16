#!/usr/bin/env bash
# ============================================================================
# mutation_test.sh - proves the testbench is strong enough to catch bugs.
# Each "mutant" is a copy of the RTL with ONE deliberate bug. The full CPU
# test-suite is run on it; a good testbench must FAIL (= mutant "killed").
# Run ./scripts/run_all.sh first (it creates build/*.hex and expected files).
# ============================================================================
set -u
cd "$(dirname "$0")/.."
PROGRAMS="alu_test mem_test branch_test illegal_test memcpy_test array_sum fibonacci full_test"
OUT=sim/mutation_results.txt
: > "$OUT"

# name | file | sed expression that injects the bug
MUTANTS=(
"BNE behaves like BEQ|branch_unit.v|s/? ~zero :/? zero :/"
"x0 not hard-wired to 0|reg_file.v|s/we \&\& rd_addr != 5'd0/we/;s/(rs1_addr == 5'd0) ? 32'h0 : //"
"SUB executes as ADD|alu_control.v|s/funct7_b5 ? \`ALU_SUB : \`ALU_ADD/\`ALU_ADD/"
"XOR executes as OR|alu.v|s/result = a ^ b;/result = a | b;/"
"S-type immediate wrong|imm_gen.v|s/instr\[31:25\], instr\[11:7\]}/instr[31:20]}/"
"B-type imm bit 11 lost|imm_gen.v|s/instr\[31\], instr\[7\],/instr[31], 1'b0,/"
"LW writes ALU result|rv32i_cpu.v|s/.sel(mem_to_reg)/.sel(1'b0)/"
"SW stores rs1 not rs2|rv32i_cpu.v|s/.wdata(rs2_data)/.wdata(rs1_data)/"
"Illegal instr writes rd|control_unit.v|s/default: illegal = 1'b1;/default: begin illegal = 1'b1; reg_write = 1'b1; end/"
"ALU-src MUX stuck at rs2|rv32i_cpu.v|s/.sel(alu_src)/.sel(1'b0)/"
"PC+4 adder adds 2|rv32i_cpu.v|s/.b(32'd4)/.b(32'd2)/"
"RegWrite not gated by en|rv32i_cpu.v|s/.we(reg_write \& en)/.we(reg_write)/"
)

killed=0; total=0
for m in "${MUTANTS[@]}"; do
    IFS='|' read -r name file expr <<< "$m"
    total=$((total+1))
    dir=sim/mutant_$total
    rm -rf "$dir"; mkdir -p "$dir"
    cp rtl/* "$dir/"
    sed -i.bak "$expr" "$dir/$file"
    if cmp -s "rtl/$file" "$dir/$file"; then
        echo "  [$total] $name : MUTATION NOT APPLIED (check sed)" | tee -a "$OUT"
        continue
    fi
    failed_by=""
    for run in "" "-DSTALL_TEST"; do
    for p in $PROGRAMS; do
        iverilog -g2005 -I "$dir" -o "$dir/sim.vvp" $run \
            -DPROG_HEX=\"build/$p.hex\" -DEXP_REGS=\"build/${p}_exp_regs.hex\" \
            -DEXP_DMEM=\"build/${p}_exp_dmem.hex\" -DEXP_PC=\"build/${p}_exp_pc.hex\" -DVCD_FILE=\"$dir/x.vcd\" \
            -DLOG_FILE=\"$dir/x.log\" tb/tb_rv32i_cpu.v $(ls $dir/*.v) 2>/dev/null
        if ! vvp -n "$dir/sim.vvp" 2>/dev/null | grep -q "RESULT: PASS"; then
            case " $failed_by " in *" $p "*) ;; *) failed_by="$failed_by $p${run:+(stall)}";; esac
        fi
    done
    done
    if [ -n "$failed_by" ]; then
        killed=$((killed+1))
        printf "  [%2d] %-26s KILLED  (detected by:%s)\n" $total "$name" "$failed_by" | tee -a "$OUT"
    else
        printf "  [%2d] %-26s SURVIVED (testbench missed it!)\n" $total "$name" | tee -a "$OUT"
    fi
    rm -rf "$dir"
done
echo "Mutation score: $killed / $total bugs detected" | tee -a "$OUT"
