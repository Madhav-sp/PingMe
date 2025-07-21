import mongoose from "mongoose";
import express from 'express'
export const connectdb= async (req,res)=>{
    try {
        const res = await mongoose.connect(process.env.MONOGO_URI);
        console.log("Database  is connected")
    } catch (error) {
        console.log(error)
    }
}