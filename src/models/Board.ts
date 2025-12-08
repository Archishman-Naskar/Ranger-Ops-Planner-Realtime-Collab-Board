import mongoose, { Schema, Document, Types } from "mongoose";

export interface IBoard extends Document {
  name: string;
  owner: Types.ObjectId;
  members: Types.ObjectId[];
  lists: Types.ObjectId[];
}

const boardSchema = new Schema<IBoard>({
  name: { type: String, required: true },

  owner: { type: Schema.Types.ObjectId, ref: "User", required: true },

  members: [{ type: Schema.Types.ObjectId, ref: "User" }],

  lists: [{ type: Schema.Types.ObjectId, ref: "List" }]
}, { timestamps: true });

export default mongoose.models.Board ||
  mongoose.model<IBoard>("Board", boardSchema);
