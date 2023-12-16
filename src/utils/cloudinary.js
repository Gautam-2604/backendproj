import {v2 as cloudinary} from "cloudinary";
import { response } from "express";
import fs from "fs";

          
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET 
});

const uploadOnCloudinary= async (localFilePath)=>{
    try {
        if(!localFilePath) return null
        //upload file o cloudinary
        cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        })
        console.log("File has been uploaded", response.url);
        return response
    } catch (error) {
        fs.unlinkSync(localFilePath)// removes the locally saved temperory file as upload failed
        return null;
    }
}

export {uploadOnCloudinary}


