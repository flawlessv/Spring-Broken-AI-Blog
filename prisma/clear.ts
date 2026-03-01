import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { join } from "path";

// 在创建 PrismaClient 之前加载环境变量
const envFile = join(process.cwd(), ".env.production");
try {
  const envContent = readFileSync(envFile, "utf-8");
  envContent.split("\n").forEach((line) => {
    const trimmedLine = line.trim();
    if (trimmedLine && !trimmedLine.startsWith("#")) {
      const [key, ...valueParts] = trimmedLine.split("=");
      if (key && valueParts.length > 0) {
        const value = valueParts.join("=").replace(/^["']|["']$/g, "");
        process.env[key.trim()] = value.trim();
      }
    }
  });
  console.log("✅ 已加载 .env.production 文件");
} catch (error) {
  // 如果文件不存在，尝试读取 .env
  try {
    const envFile2 = join(process.cwd(), ".env");
    const envContent = readFileSync(envFile2, "utf-8");
    envContent.split("\n").forEach((line) => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith("#")) {
        const [key, ...valueParts] = trimmedLine.split("=");
        if (key && valueParts.length > 0) {
          const value = valueParts.join("=").replace(/^["']|["']$/g, "");
          process.env[key.trim()] = value.trim();
        }
      }
    });
    console.log("✅ 已加载 .env 文件");
  } catch (error2) {
    console.log("⚠️  未找到 .env.production 或 .env 文件，使用系统环境变量");
  }
}

// 验证 DATABASE_URL 是否存在
if (!process.env.DATABASE_URL) {
  console.error("❌ 错误: DATABASE_URL 环境变量未设置");
  console.error("请确保 .env.production 文件存在且包含 DATABASE_URL");
  process.exit(1);
}

const prisma = new PrismaClient();

async function main() {
  console.log("🗑️  开始清空数据库...");

  try {
    // 按照依赖关系的反序删除数据，避免外键约束问题
    const count1 = await prisma.postTag.deleteMany({});
    console.log(`✅ 已清空 PostTag 表 (${count1.count} 条)`);

    const count2 = await prisma.post.deleteMany({});
    console.log(`✅ 已清空 Post 表 (${count2.count} 条)`);

    const count3 = await prisma.category.deleteMany({});
    console.log(`✅ 已清空 Category 表 (${count3.count} 条)`);

    const count4 = await prisma.tag.deleteMany({});
    console.log(`✅ 已清空 Tag 表 (${count4.count} 条)`);

    const count5 = await prisma.profile.deleteMany({});
    console.log(`✅ 已清空 Profile 表 (${count5.count} 条)`);

    const count6 = await prisma.user.deleteMany({});
    console.log(`✅ 已清空 User 表 (${count6.count} 条)`);

    console.log("🎉 数据库清空完成！");
  } catch (error: any) {
    console.error("❌ 清空数据库失败:");
    console.error(error.message);
    process.exit(1);
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
