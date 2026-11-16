# ============================================================================
# vivado_build.tcl - Vivado batch flow for the Basys-3 board (run on a lab PC)
#
#   cd Single-Cycle-RV32I-Processor
#   vivado -mode batch -source fpga/vivado_build.tcl
#
# Produces in fpga/vivado_out/:
#   utilization.rpt  (LUTs, FFs, LUTRAM, IO)   timing.rpt  (WNS -> Fmax)
#   fpga_top.bit     (program the board with Hardware Manager)
#
# Fmax = 1000 / (10.0 - WNS) MHz   (WNS from timing.rpt, clock period 10 ns)
# ============================================================================
set part   xc7a35tcpg236-1
set outdir fpga/vivado_out
file mkdir $outdir

# program to load (must be assembled first: ./scripts/run_all.sh)
set hex [file normalize build/full_test.hex]

read_verilog [glob rtl/*.v]
read_verilog fpga/fpga_top.v
read_xdc     fpga/basys3.xdc
set_property include_dirs [file normalize rtl] [current_fileset]

synth_design -top fpga_top -part $part -include_dirs rtl \
    -generic IMEM_FILE=\"$hex\"
opt_design
place_design
route_design

report_utilization    -file $outdir/utilization.rpt
report_timing_summary -file $outdir/timing.rpt
report_power          -file $outdir/power.rpt
write_bitstream -force $outdir/fpga_top.bit
puts "Done. Reports in $outdir/"
