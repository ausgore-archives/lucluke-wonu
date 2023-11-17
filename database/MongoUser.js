const { Schema, model: createModel, Types } = require("mongoose");
const MongoInventory = require("./MongoInventory");

const model = createModel("user", new Schema({
	userId: String,
	coins: Number,
	favorite: {
		card: { type: Schema.Types.ObjectId, ref: "card" },
		level: Number,
		exp: Number
	},
	cooldowns: {
		claim: Number,
		drop: Number,
		daily: Number
	},
	streaks: {
		daily: { type: Number, default: 0 }
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
		const data = await model.findOne({ userId: this.userId }) ?? await model.create({ userId: this.userId });
		return data.populate("favorite.card");
	}

	/**
	 * @typedef {"drop" | "claim" | "daily"} CooldownType
	 */

	/**
	 * @param {CooldownType} cooldown 
	 * @param {number} duration 
	 */
	async setCooldown(cooldown, duration) {
		const $set = {};
		$set[`cooldowns.${cooldown}`] = Date.now() + duration;
		return model.findOneAndUpdate({ userId: this.userId }, { $set }, { new: true, upsert: true });
	}

	/**
	 * @param {Types.ObjectId} _id 
	 */
	setFavorite(_id) {
		return model.findOneAndUpdate({ userId: this.userId }, { $set: { favorite: { card: _id, level: 0, exp: 0 } } }, { new: true, upsert: true });
	}

	/**
	 * @param {number} coins
	 * @param {number} xp
	 * @param {Types.ObjectId} _id
	 */
	async login(coins, xp, _id) {
		const data = await this.get();
		const update = { $set: {}, $inc: {} };
		const result = { coins: null, streaks: null, xp: null, card: null };

		if (data.cooldowns.daily + 8.64e+7 > Date.now()) {
			result.coins = data.streaks.daily >= 6 ? (coins * 7) : coins + (coins * (data.streaks.daily ?? 0));
			result.streaks = data.streaks.daily + 1;
			if (data.favorite.card) result.xp = xp + (xp * (data.streaks.daily ?? 0));
			update.$inc["streaks.daily"] = 1;
			update.$inc["favorite.exp"] = result.xp;
			update.$inc.coins = result.coins;
		}
		else {
			result.coins = coins;
			result.streaks = 1;
			if (data.favorite.card) result.xp = xp;
			update.$set["streaks.daily"] = 1;
			update.$inc["favorite.exp"] = result.xp;
			update.$inc.coins = coins;
		}
		if (result.xp) result.card = data.favorite.card;

		await model.findOneAndUpdate({ userId: this.userId }, update, { new: true, upsert: true });
		this.inventory.add(_id);
		return result;
	}

	/**
	 * @param {CooldownType} cooldown 
	 */
	async getCooldown(cooldown) {
		const user = await this.get();
		return user.cooldowns[cooldown];
	}

}