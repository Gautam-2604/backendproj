import { asynchandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"

const generateAccessAndRefreshToken = async(userId)=>{
    try {
        const user= await User.findById(userId)
        const accessToken=user.generateAccessToken
        const refreshToken=user.generateRefreshToken

        user.refreshToken=refreshToken
        await user.save({validateBeforeSave:false})
    } catch (error) {
        throw new ApiError(500,"Something went wrong")
    }
}

const registerUser = asynchandler( async (req,res)=>{
        //get details from frontend
        //validation not empty
        //check if user already exists
        //check for images and avatars
        //upload them to cloudinary
        //create user object - create entry in db
        //remove password and refresh token from response
        //check for user creation- successful or not
        //return res


        const {fullName, email, username, password}=req.body
        console.log("email : ", email);

        if(
            [fullName, email, username, password].some((field)=>field?.trim()===""
            
            )
        ){
            throw new ApiError(400,"Field required")
        }

        const existedUser = await User.findOne({
            $or: [{ username },{ email }]
        })

        if(existedUser){
            throw new ApiError(409," User with email or username already exists")
        }
        const avatarLocalPath = req.files?.avatar[0]?.path;
        const coverImageLocalPath = req.files?.coverImage[0]?.path;

        if(!avatarLocalPath){
            throw new ApiError(400, "Avatar is compulsory")
        }

        const avatar = await uploadOnCloudinary(avatarLocalPath);
        const coverImage = await uploadOnCloudinary(coverImageLocalPath);

        if(!avatar){
            throw new ApiError(400, "Avatar is compulsory")
        }

        const user = await User.create({
            fullName,
            avatar: avatar.url,
            coverImage: coverImage?.url || "",
            email,
            password,
            username: username.toLowerCase()

        })

       const createdUser = await User.findById(user._id).select(
        " -password -refreshToken"
       )

       if(!createdUser){
            throw new ApiError(500, "Something went wrong")
       }

       return res.status(201).json(
        new ApiResponse(200, createdUser, "Successful Registration")
       )
    })

    const loginUser= asynchandler(async(req,res)=>{
        //req body-> data
        //username or email
        //find a user
        //if user found- password check
        //access and refresh token
        //send cookies

        const {email, username, password}=req.body

        if(!username && !email){
            throw new ApiError(400,"Username or email is required");
        }

        const user = await User.findOne({
            $or:[{username}, {email}]
        })

        if(!user){
            throw new ApiError(400,"User does not exist")
        }

        const isPasswordValid=await user.isPasswordCorrect(password)
        if(!isPasswordValid){
            throw new ApiError(401,"Invalid Password");
        }

        const {accessToken, refreshToken}=await generateAccessAndRefreshToken(user._id)
        const loggedInUser = await user.findById(user._id).select("-password -refreshToken")

        const options={
            httpOnly:true,
            secure:true
        }
        return res.status(200).cookie("accessToken",accessToken,options).cookie("refreshToken",refreshToken,options).json(
            new ApiResponse(200,{
                user: loggedInUser, accessToken, refreshToken
            },
            "User logged in successfully"
            )
        )
    })

    const logoutUser=asynchandler(async(req,res)=>{
        User.findByIdAndUpdate(req.user._id,{
            $set:{
                refreshToken: undefined
            }},{
                new: true
            }
        )

        const options={
            httpOnly:true,
            secure:true
        }

        return res.status(200).clearCookie("accessToken",options).clearCookie("refreshToken",options).json(new ApiResponse(200,{},"User Logged Out"))
    })
    const refreshAccessToken = asynchandler(async(req,res)=>{
        const incomingRefreshToken=req.cookies.refreshToken || req.body.refreshToken
        if(incomingRefreshToken){
            throw new ApiError(401,"Unauthorised Request")
        }
        const decodedToken=jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )

        const user = await User.findById(decodedToken?._id)
        if(!user){
            throw new ApiError(401,"No User Found")
        }
        if(incomingRefreshToken !==user?.refreshToken){
            throw new ApiError(401,"Expired")
        }

        const options={
            httpOnly: true,
            secure: true
        }
        const {accessToken, newRefreshToken}=await generateAccessAndRefreshToken(user._id)
        return res
        .status(200)
        .cookie("accessToken",accessToken)
        .cookie("refreshToken",newRefreshToken,options)
        .json(
            new ApiResponse(
                200,
                {accessToken,newRefreshToken},
                "Access Token Refreshed"
            )
        )
            
        
    })
export { registerUser, 
        loginUser,
        logoutUser,
        refreshAccessToken
        }