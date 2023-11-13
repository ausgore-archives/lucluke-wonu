const { Schema, model: createModel } = require("mongoose");
const { promises: fs } = require("fs");
const { AttachmentBuilder } = require("discord.js");
const MongoInventory = require("./MongoInventory");

const model = createModel("card", new Schema({
	id: String,
	name: String,
	group: String,
	era: String,
	tier: Number,
	droppable: Boolean
}));

module.exports = class MongoCard {
	constructor() {
		this.model = model;
	}

	/**
	 * @typedef {Object} Card
	 * @property {string} id
	 * @property {string} name
	 * @property {string} group
	 * @property {string} era
	 * @property {number} tier
	 * @property {boolean} droppable
	 */

	/**
	 * @param {string} id
	 * @param {boolean} withImage 
	 */
	async get(id, withImage) {
		const data = await model.findOne({ id });
		if (!data) return null;
		if (withImage) {
			const buffer = await fs.readFile(`images/${id}.png`);
			data.attachment = new AttachmentBuilder(buffer, { name: `${id}.png` });	
		}
		return data;
	}

	/**
	 * @param {string} id 
	 * @param {Card} card 
	 */
	async update(id, card) {
		return model.findOneAndUpdate({ id }, { $set: card });
	}

	/**
	 * @param {string} id 
	 */
	async delete(id) {
		fs.unlink(`images/${id}.png`).catch(() => null);
		const card = await model.findOneAndDelete({ id });
		await new MongoInventory().model.deleteMany({ card: card._id });
		return card;
	}

	/**
	 * @param {Card} card 
	 */
	async create(card) {
		fs.writeFile(`images/${card.id}.png`, card.buffer);
		card.attachment = new AttachmentBuilder(card.buffer, { name: `${card.id}.png` });
		delete card.buffer;
		return model.create(card);
	}
}