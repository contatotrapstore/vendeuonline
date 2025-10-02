import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { randomUUID } from "crypto";

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function createAdmin() {
  console.log("🔧 Creating admin principal account...\n");

  // Create admin user
  const adminData = {
    id: randomUUID(),
    email: "admin@vendeuonline.com.br",
    password: "$2b$12$4l3T5osGRPwm5ZjGlRzI2.pq7O7jMIz9N0RzAFcFR25dzwKrv.xWu", // Admin@2025!
    name: "Administrador Principal",
    type: "ADMIN",
    emailVerified: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    // Insert user
    const { data: user, error: userError } = await supabase.from("users").insert([adminData]).select().single();

    if (userError) {
      console.error("❌ Error creating admin user:", userError.message);
      return;
    }

    console.log("✅ Admin user created successfully!");
    console.log("   ID:", user.id);
    console.log("   Email:", user.email);
    console.log("   Name:", user.name);

    // Create admin record
    const { data: admin, error: adminError } = await supabase
      .from("admins")
      .insert([
        {
          id: randomUUID(),
          userId: user.id,
          permissions: ["ALL"],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (adminError) {
      console.error("❌ Error creating admin record:", adminError.message);
      return;
    }

    console.log("✅ Admin record created successfully!\n");

    console.log("=".repeat(60));
    console.log("🎯 ADMIN PRINCIPAL CRIADO COM SUCESSO!");
    console.log("=".repeat(60));
    console.log("");
    console.log("📧 Email: admin@vendeuonline.com.br");
    console.log("🔑 Senha: Admin@2025!");
    console.log("");
    console.log("🌐 Acesso: https://www.vendeu.online/login");
    console.log("   ou localmente: http://localhost:5173/login");
    console.log("");
    console.log("🛡️ Permissões: Acesso total ao sistema");
    console.log("=".repeat(60));
  } catch (error) {
    console.error("❌ Unexpected error:", error);
  }
}

createAdmin();
