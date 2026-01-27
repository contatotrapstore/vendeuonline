require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 Testing Supabase connection...');
console.log('URL:', supabaseUrl);
console.log('Key:', supabaseServiceKey ? `${supabaseServiceKey.substring(0, 20)}...` : 'NOT FOUND');

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testConnection() {
  try {
    // Test 1: Simple count query
    console.log('\n📊 Test 1: Counting users...');
    const { data, error, count } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error('❌ Error:', error);
      return;
    }

    console.log('✅ Users count:', count);

    // Test 2: Actual delete (ProductSpecification - should be safe to delete all)
    console.log('\n🗑️ Test 2: Deleting ProductSpecification...');
    const { data: deleteData, error: deleteError } = await supabase
      .from('ProductSpecification')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all (impossible ID as filter)

    if (deleteError) {
      console.error('❌ Delete Error:', deleteError);
      return;
    }

    console.log('✅ ProductSpecification deleted successfully');

    // Test 3: Count after delete
    console.log('\n📊 Test 3: Verifying ProductSpecification count...');
    const { count: specCount } = await supabase
      .from('ProductSpecification')
      .select('*', { count: 'exact', head: true });

    console.log('✅ ProductSpecification count after delete:', specCount);

  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

testConnection();
