const { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, AttachmentBuilder } = require("discord.js");
const MongoUser = require("../database/MongoUser");
const config = require("../config");
const humanize = require("humanize-duration");
const MongoCard = require("../database/MongoCard");
const { promises: fs } = require("fs");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("login")
		.setDescription("Claim your daily coins!")
		.setDMPermission(false),
	/**
	 * @param {ChatInputCommandInteraction} interaction 
	 */
	run: async (interaction) => {
		const mongo = new MongoUser(interaction.user.id);
		const embed = new EmbedBuilder()
			.setColor(config.theme)
			.setAuthor({ name: interaction.user.username, iconURL: interaction.user.displayAvatarURL({ forceStatic: false }) })
			.setDescription(`${interaction.user} has logged in!`);

		const cooldown = await mongo.getCooldown("daily");
		if (cooldown > Date.now()) {
			embed
				.setTitle("This command is on cooldown!")
				.setDescription(`**Total cooldown:** \`1\` day\n**Time remaining:** ${humanize(cooldown - Date.now(), { delimiter: " and ", round: true }).replace(/\d+/g, n => `\`${n}\``)}`);
			return interaction.reply({ embeds: [embed], ephemeral: true });
		}
		await interaction.deferReply();
		mongo.setCooldown("daily", 8.64e+7);

		const [card] = await new MongoCard().getCards();
		const buffer = await fs.readFile(`images/${card.id}.png`);
		const image = new AttachmentBuilder(buffer, { name: "card.png" });

		const data = await mongo.login(100, 10, card._id);

		embed
			.setImage("attachment://card.png")
			.setDescription(`<:wonu_comp:1152129777055039529> ${interaction.user} has logged in!\n__${data.streaks} daily streak__\n\n<:wonu_run:1152129877743501346> You've gotten ${card.name} // ${card.era} ${config.tiers[card.tier].emoji}\nYou've gained ${data.coins} <:wonu_coins:1146974432389234768>!${data.xp ? `\n${data.card.name} has gained ${data.xp} exp!` : ""}\n\n<:wonu_friends:1152129841383084062> __Thank you for logging in!__`);
		return interaction.followUp({ embeds: [embed], files: [image] });
	}
}