import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await connectToDatabase();

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json({ error: "Email already in use" }, { status: 400 });
    }

    // SECURITY: Explicitly ONLY use name, email, password from the body.
    // This prevents role injection — signup ALWAYS creates an Employee.
    // Roles can only be assigned by Admin through the Employee Directory.
    const newUser = await User.create({
      name,
      email,
      password,
      role: "Employee", // Hardcoded — never from request body
      status: "Active",
    });

    return NextResponse.json(
      { message: "User created successfully", userId: newUser._id },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Signup error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
