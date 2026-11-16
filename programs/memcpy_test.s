# ============================================================================
# Test 5 : Memory copy with verification
# Fills an 8-word source array (values -5, -2, 1, ... in steps of 3), copies it
# word by word to a destination array, then reads both arrays back and counts
# mismatches. Exercises LW/SW with a moving pointer, nested use of loads,
# BNE loops and a BEQ decision.
# Result: a0 (x10) = 1 if the copy is correct (else -1), stored at mem[0x200];
#         a3 (x13) = XOR checksum of the copied array, stored at mem[0x204].
# ============================================================================
        addi s0, x0, 0x100      # source base
        addi s1, x0, 0x180      # destination base
        addi a1, x0, 8          # n = 8 words

        addi t1, x0, 0          # i = 0
        addi t2, x0, -5         # value = -5
        addi t3, s0, 0          # src pointer
fill:   sw   t2, 0(t3)          # src[i] = value
        addi t2, t2, 3          # value += 3
        addi t3, t3, 4
        addi t1, t1, 1
        bne  t1, a1, fill

        addi t1, x0, 0          # copy loop
        addi t3, s0, 0
        addi t4, s1, 0
copy:   lw   t5, 0(t3)          # t5 = src[i]
        sw   t5, 0(t4)          # dst[i] = t5
        addi t3, t3, 4
        addi t4, t4, 4
        addi t1, t1, 1
        bne  t1, a1, copy

        addi t1, x0, 0          # verify loop
        addi t3, s0, 0
        addi t4, s1, 0
        addi a2, x0, 0          # mismatches = 0
        addi a3, x0, 0          # checksum = 0
verify: lw   t5, 0(t3)
        lw   t6, 0(t4)
        xor  a3, a3, t6         # checksum ^= dst[i]
        beq  t5, t6, same
        addi a2, a2, 1          # mismatch found
same:   addi t3, t3, 4
        addi t4, t4, 4
        addi t1, t1, 1
        bne  t1, a1, verify

        addi a0, x0, 1          # assume success
        beq  a2, x0, done
        addi a0, x0, -1         # failure marker
done:   sw   a0, 512(x0)        # mem[0x200] = result
        sw   a3, 516(x0)        # mem[0x204] = checksum
        halt
