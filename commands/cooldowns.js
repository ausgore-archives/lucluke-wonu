const { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } = require("discord.js");
const MongoUser = require("../database/MongoUser");
const config = require("../config");
const humanize = require("humanize-duration");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("cooldowns")
		.setDescription("Shows your current cooldowns"),
	/**
	 * @param {ChatInputCommandInteraction} interaction 
	 */
	run: async (interaction) => {
		const data = await new MongoUser(interaction.user.id).get();
		const cooldowns = new Map();
		for (const cooldown in data.cooldowns) {
			const timestamp = data.cooldowns[cooldown];
			if (timestamp > Date.now()) cooldowns.set(cooldown, humanize(timestamp - Date.now(), { delimiter: " and ", round: true }).replace(/\d+/g, n => `\`${n}\``));
		}

		const embed = new EmbedBuilder()
			.setColor(config.theme)
			.setAuthor({ name: interaction.user.username, iconURL: interaction.user.displayAvatarURL({ forceStatic: false }) })
			.setDescription(`<:wonu_ds:1152129799964336208> **WONU COOLDOWNS**\n\n<:wonu_run:1152129877743501346> Drop // ${cooldowns.get("drop") ?? "Available"}\n<:wonu_diamond:1151257682444042290> Claim // ${cooldowns.get("claim") ?? "Available"}\n<:wonu_comp:1152129777055039529> Stream // ${cooldowns.get("stream") ?? "Available"}\n<:wonu_friends:1152129841383084062> Login // ${cooldowns.get("daily") ?? "Available"}`);
		return interaction.reply({ embeds: [embed] });
	}
}