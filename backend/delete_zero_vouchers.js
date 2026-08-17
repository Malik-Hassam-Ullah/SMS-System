require('dotenv').config();
const { supabaseAdmin } = require('./src/config/supabase');

async function run() {
    // Find and delete zero-amount vouchers that have voucher_number >= 5000 (the dummy set)
    const { data: zeroVouchers, error: fetchErr } = await supabaseAdmin
        .from('fee_vouchers')
        .select('id, voucher_number, current_fee, total_payable')
        .eq('current_fee', 0)
        .eq('previous_balance', 0)
        .eq('other_charges', 0)
        .eq('total_payable', 0)
        .eq('amount_paid', 0);

    if (fetchErr) {
        console.error("Error fetching zero vouchers:", fetchErr);
        return;
    }

    console.log(`Found ${zeroVouchers.length} zero-amount vouchers.`);
    console.log("Sample:", zeroVouchers.slice(0, 10).map(v => v.voucher_number).join(', '));

    if (zeroVouchers.length === 0) {
        console.log("Nothing to delete.");
        return;
    }

    const ids = zeroVouchers.map(v => v.id);

    const { error: deleteErr } = await supabaseAdmin
        .from('fee_vouchers')
        .delete()
        .in('id', ids);

    if (deleteErr) {
        console.error("Error deleting zero vouchers:", deleteErr);
        return;
    }

    console.log(`Successfully deleted ${ids.length} zero-amount vouchers.`);
}

run();
