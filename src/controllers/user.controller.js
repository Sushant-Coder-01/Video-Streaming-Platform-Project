import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/apiResponse.js";
import jwt from "jsonwebtoken"

const generateAccessAndRefreshTokens = async(userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken ;

        await user.save({validateBeforeSave: false});

        return {accessToken, refreshToken}

        
    } catch (error) {
        throw new ApiError(500, "Something is went wrong while generating access and refresh tokens");
    }
} 

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
        throw new ApiError(400, "all fields is required");
    }


 // check if user already exist: username , email
    const existedUser = await User.findOne({
        $or: [{ userName }, { email }]                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     
    })

    if(existedUser){
        throw new ApiError(409 , "User with email or username already exist");
    }

// check for images, check for avatar
    //console.log(req.files);

    const avatarLocalPath = req.files?.avatar?.[0]?.path ;
    //const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;

    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path ;
    }

    if(!avatarLocalPath){
        throw new ApiError(400, "avatar file is requried")
    }
// upload them to cloudinary, avatar
    
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    

    if(!avatar){
        throw new ApiError(400, "avatar file is requried")
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
        throw new ApiError(500, "Something went wrong while registering the user.")
    }

// return res.

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User Registered Successfully.")
    )

})

const loginUser = asyncHandler( async (req, res) => {
    
//     // req body --> data
//     // username/email
//     // find the user
//     // password check
//     // access and refresh token.
//     // send cookies


// req body --> data

    const {email, userName, password} = req.body ;

// username/email

    if(!(email || userName)){
        throw new ApiError(400, "email or userName is required.")
    }

// find the user

    const user = await User.findOne({
        $or: [ {email}, {userName} ],
    })

    if(!user){
        throw new ApiError(404, "User does not exist.")
    }

// password check

    const isPasswordValid =  await user.isPasswordCorrect(password)

    if(!isPasswordValid){
        throw new ApiError(404, "Invalid user Credentials")
    }

// access and refresh token.


    const{accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id)

    const userLoggedIn = await User.findOne(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true
    }

// return res.

    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json( 
        new ApiResponse(
            200,
            {
                user: loginUser, accessToken, refreshToken
            },
            "User logged in Successfully"))

})

const logoutUser = asyncHandler( async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined,
            }
        },
        {
            new: true
        }
     )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged Out Successfully!"))
})

const refreshAccessToken = asyncHandler( async (req, res) => {
    const incomingRefreshToken = req.cookies.accessToken || req.body.accessToken

    if (!refreshAccessToken) {
        throw new ApiError(401, "Unauthorized request")
    }

    try {
        const decodedRefreshToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
    
        const user = await User.findById(decodedRefreshToken?._id)
    
        if (!user) {
            throw new ApiError(401, "Invalid Refresh Token")   
        }
    
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401, "Refresh token is expired used")
        }
    
        const options = {
    
            httpOnly: true,
            secure: true
        }
    
        await generateAccessAndRefreshTokens(user._id)
    
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("newRefreshToken", newRefreshToken, options)
        .json(
            new ApiResponse(200,
                { accessToken, refreshToken: newRefreshToken },
                "Access Token Refreshed"
            )
        )
    } catch (error) {

        throw new ApiError(401, error?.message || "Invalid refresh token")

    }


})

const changeCurrentPassword = asyncHandler( async (req, res) => {
    const {oldPassword, newPassword} = req.body 

    const user = await User.findById(req.user?._id)

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect){
        throw new ApiError(400, "Invalid old Password")
    }

    user.password = newPassword

    await user.save({validateBeforeSave: false})

    return res
    .status(200)
    .json(new ApiResponse(200,{},"Password Changed Successfully"))
})

const getCurrentUser = asyncHandler( async (req, res) => {

    return res
    .status(200)
    .json(200, req.user, "Current user is fetched Successfully")

})

const updateAccountDetails = asyncHandler( async (req, res) => {

    const { fullName, email } = req.body

    if(!(fullName || email)){
        throw new ApiError(400, "All fields are required")
    }

    const user = await User.findByIdAndUpdate(
        
        req.user?._id,
        {
            $set: {
                fullName,
                email
            }
        },
        {new: true}
    
    
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, user, "Account Details Updated Successfully"))

})

const updateUserAvatar = asyncHandler( async (req, res) => {

    const avatarLocalPath = req.file?.path

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file is missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if(!avatar.url){
        throw new ApiError(400, "Error while uploading on avatar")
    }

    const user = await User.findByIdAndUpdate(

        req.user?._id,
        {
            $set: {
                 avatar: avatar.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(200, user, "Avatar Update Successfully")

}) 

const updateUserCoverImage = asyncHandler( async (req, res) => {

    const coverImageLocalPath = req.file?.path

    if(!coverImageLocalPath){
        throw new ApiError(400, "Cover image file is missing")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!coverImage.url){
        throw new ApiError(400, "Error while uploading on cover image")
    }

    const user = await User.findByIdAndUpdate(

        req.user?._id,
        {
            $set: {
                 coverImage: coverImage.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(200, user, "Cover Image Update Successfully")

}) 

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage
}