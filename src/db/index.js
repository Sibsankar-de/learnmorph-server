import mongoose from "mongoose"

const DB_NAME = 'datastack'

export const connectDb = async () => {
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        console.log(`MongoDb URI connected. Host string - ${connectionInstance.connection.host}`);
    } catch (error) {
        console.error('MongoDb connection error: ' + error);
    }
}