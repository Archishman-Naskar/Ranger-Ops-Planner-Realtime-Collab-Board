import mongoose, { Document, Schema, Model } from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";

// Define the User interface including any custom methods
export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  isEmailVerified: boolean;
  refreshToken?: string;
  forgotPasswordToken?: string;
  forgotPasswordExpiry?: Date;
  emailVerificationToken?: string;
  emailVerificationExpiry?: Date;

  isPasswordCorrect(password: string): Promise<boolean>;
  generateAccessToken(): Promise<string>;
  generateRefreshToken(): Promise<string>;
  generateTemporaryToken(): Promise<{ unHashedToken: string; hashedToken: string; tokenExpiry: number }>;
}

// Mongoose schema definition
const userSchema = new Schema<IUser>(
  {
    username: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: [true, "Password is required"] },
    isEmailVerified: { type: Boolean, default: false },
    refreshToken: { type: String },
    forgotPasswordToken: { type: String },
    forgotPasswordExpiry: { type: Date },
    emailVerificationToken: { type: String },
    emailVerificationExpiry: { type: Date },
  },
  { timestamps: true }
);

userSchema.pre<IUser>("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.isPasswordCorrect = async function (password: string): Promise<boolean> {
  return await bcrypt.compare(password, this.password);
};

userSchema.methods.generateAccessToken = async function (): Promise<string> {
  return await jwt.sign(
    { _id: this._id, email: this.email, username: this.username },
    process.env.ACCESS_TOKEN_SECRET ?? "",
    { expiresIn : process.env.ACCESS_TOKEN_EXPIRY as any }
  );
};

userSchema.methods.generateRefreshToken = async function (): Promise<string> {
  return await jwt.sign(
    { _id: this._id },
    process.env.REFRESH_TOKEN_SECRET ?? "",
    // { expiresIn: process.env.REFRESH_TOKEN_SECRET as any } will also do but it can hide potential runtime error
    //use of any tells typeScript to skip the type check
    //or else if we donot use any there will be conflict bwteen the type of what jwt expects and what we are passing . Then we have to handel it differently. But we just avoid the type check here but it is risky.
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRY as any }
  );
};

userSchema.methods.generateTemporaryToken = async function (): Promise<{ unHashedToken: string; hashedToken: string; tokenExpiry: number }> {
  const unHashedToken = await crypto.randomBytes(20).toString("hex");
  const hashedToken = await crypto.createHash("sha256").update(unHashedToken).digest("hex");
  const tokenExpiry = await Date.now() + 20 * 60 * 1000;
  return { unHashedToken, hashedToken, tokenExpiry };
};

// Model declaration, with explicit IUser type so TS knows about instance methods
const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>("User", userSchema);
export default User;

/*
EXPLANATION:

1. Mongoose's base Document type does not know about custom instance methods added via schema.methods.
2. By defining the IUser interface, including our custom methods (isPasswordCorrect, etc), 
   and passing IUser as the generic to mongoose.model, TypeScript now knows exactly what properties 
   and methods an instance of User will have.
3. This fixes all "property does not exist" errors and allows auto-completion and proper type checking 
   for your custom user schema methods anywhere User is used.
*/

/*
When you see userSchema.pre<IUser>("save", async function (next) { ... }) in your code, it is TypeScript generic type annotation for Mongoose document middleware.

What does it mean?
pre() is used to attach middleware that runs before a document is saved, removed, etc.

When you add a middleware like userSchema.pre("save", function (next) {...}), the this context inside the function refers to the Mongoose document (the instance being saved).

TypeScript needs to know the type of this inside your function to provide type-safety and autocompletion.

By writing .pre<IUser>, you tell TypeScript that the this context in the middleware function will be of type IUser, which includes all fields as well as any custom instance methods you have defined.
*/