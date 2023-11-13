const { Schema, model: createModel } = require("mongoose");
const MongoInventory = require("./MongoInventory");

const model = createModel("user", new Schema({
	userId: String,
	cooldowns: {
		claim: Number,
		drop: Number
	}
}));

module.exports = class MongoUser {
	/**
	 * @param {string} userId 
	 */
	constructor(userId) {
		this.userId = userId;
		this.model = model;
		this.inventory = new MongoInventory(this.userId);
	}

	async get() {
		return await model.findOne({ userId: this.userId }) ?? await model.create({ userId: this.userId });
	}

	/**
	 * @typedef {"drop" | "claim"} CooldownType
	 */

	/**
	 * @param {CooldownType} cooldown 
	 * @param {number} duration 
	 */
	async setCooldown(cooldown, duration) {
		const $set = {};
		$set[`cooldowns.${cooldown}`] = Date.now() + duration;
		return model.findOneAndUpdate({ userId: this.userId }, { $set }, { new: true });
	}

	/**
	 * @param {CooldownType} cooldown 
	 */
	async getCooldown(cooldown) {
		const user = await this.get();
		return user.cooldowns[cooldown];
	}
	
}