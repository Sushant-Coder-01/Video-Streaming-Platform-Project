import { asyncHandler } from "../utils/asyncHandler.js";
import { Apierror } from "../utils/apiErrors.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { response } from "express";




const registerUser = asyncHandler( async (req, res) => {

    // get user details from frontend/postman
    // validation - not empty
    // check if user already exist: username , email
    // check for images, check for avatar
    // upload them to cloudinary, avatar
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return res.

// get user details from frontend/postman
    const {fullName, email, userName, password} = req.body
    // console.log("email: ", email);

// You can do 1 by 1 also
    // if(fullName === ""){
    //     throw new Apierror(400, "fullName is required")
    // }

// validation - not empty
    if([fullName, email, userName, password].some( (field) => field?.trim() === "")  
    ){
        throw new Apierror(400, "all fields is required")
    }


 // check if user already exist: username , email
    const existedUser = await User.findOne({
        $or: [{ userName }, { email }]                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     
    })

    if(existedUser){
        throw new Apierror(409 , "User with email or username already exist");
    }

// check for images, check for avatar
    //console.log(req.files);

    const avatarLocalPath = req.files?.avatar[0]?.path ;
    //const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;

    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path ;
    }

    if(!avatarLocalPath){
        throw new Apierror(400, "avatar file is requried")
    }
// upload them to cloudinary, avatar
    
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if(!avatar){
        throw new Apierror(400, "avatar file is requried")
    }

// create user object - create entry in db

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        userName: userName.toLowerCase()
    })

// remove password and refresh token field from response

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

// check for user creation

    if(!createdUser){
        throw new Apierror(500, "Something went wrong while registering the user.")
    }

// return res.

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User Registered Successfully.")
    )

})

export {registerUser}