
import {connect} from "@/dbConfig/dbConfig";
import User from "@/models/userModels";
import { NextRequest,NextResponse } from "next/server";
import bcrypt from "bcryptjs";


connect();

export async function POST(request:NextRequest){

  const data = await request.json();
 const {hashedToken} = data;
  console.log("Token Recived : ",hashedToken);
  
  const userValid = await User.findOne({
  emailVerificationToken: hashedToken,
  emailVerificationExpiry: { $gt: new Date() }
  }).select('username email isEmailVerified');


  const user= await User.findOne({
    emailVerificationToken: hashedToken,
  });

  if(userValid){
    console.log("Validuser Found : ",userValid);
    
    userValid.isEmailVerified=true;
    userValid.emailVerificationToken=undefined;
    userValid.emailVerificationExpiry=undefined;
    await userValid.save();

    return NextResponse.json({
      message:"Email Verificatio Successfull.",
      success:true,
      userValid
    })

  }

  if(user){

    await user.deleteOne();

    return NextResponse.json({ error: "Link has expired. User deleted." },
      { status: 400 });

  }

  return NextResponse.json({ error: "Could not verify the user ." },
      { status: 400 });

}