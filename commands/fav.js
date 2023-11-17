const { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } = require("discord.js");
const MongoInventory = require("../database/MongoInventory");
const MongoCard = require("../database/MongoCard");
const config = require("../config");
const MongoUser = require("../database/MongoUser");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("fav")
		.setDescription("Favorie-related commands")
		.addSubcommand(cmd => cmd
			.setName("set")
			.setDescription("Set a favorite card on your profile!")
			.addStringOption(opt => opt.setName("id").setDescription("The card's ID").setAutocomplete(true).setRequired(true))),
	/**
	 * @param {ChatInputCommandInteraction} interaction 
	 */
	run: async (interaction) => {
		const id = interaction.options.getString("id");

		const _id = (await new MongoCard().get(id))?._id;
		const card = await new MongoInventory(interaction.user.id).get(_id);
		if (!card) return interaction.reply({ content: "You do not own a card with that ID in your inventory.", ephemeral: true });

		await new MongoUser(interaction.user.id).setFavorite(_id);

		const embed = new EmbedBuilder()
			.setColor(config.theme)
			.setDescription(`${interaction.user} set **${id}** as their favorite card!`);
		return interaction.reply({ embeds: [embed] });
	},
	/**
	 * @param {AutocompleteInteraction} interaction
	 */
	autocomplete: async (interaction) => {
		const mongo = new MongoInventory(interaction.user.id);
		const cards = (await mongo.getAll()).map(c => c.card.id);
		const value = interaction.options.getFocused();
		await interaction.respond(cards.filter(c => c.startsWith(value.toUpperCase())).map(id => ({ name: id, value: id })));
	}
}