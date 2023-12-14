import { asynchanlder } from "../utils/asyncHandler.js"
const registerUser = asynchanlder( async (req,res)=>{
    res.status(200).json({
        message: "ok"
    })
})

export { registerUser, }