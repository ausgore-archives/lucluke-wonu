const { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, AutocompleteInteraction } = require("discord.js");
const config = require("../config");
const MongoCard = require("../database/MongoCard");
const MongoInventory = require("../database/MongoInventory");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("staff")
		.setDescription("Staff-related commands")
		.setDMPermission(false)
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
		.addSubcommand(cmd => cmd
			.setName("upload")
			.setDescription("Upload a new card")
			.addStringOption(opt => opt.setName("name").setDescription("The name of the card").setRequired(true))
			.addStringOption(opt => opt.setName("group").setDescription("The group this card will belong to").setRequired(true))
			.addStringOption(opt => opt.setName("era").setDescription("The era where the card's image came from").setRequired(true))
			.addStringOption(opt => opt.setName("id").setDescription("The card's id").setRequired(true))
			.addStringOption(opt => opt.setName("tier").setDescription("The card's tier").setRequired(true).setChoices(...config.tiers.map((t, i) => ({ name: t.name, value: `${i}` }))))
			.addBooleanOption(opt => opt.setName("droppable").setDescription("Whether this card is droppable").setRequired(true))
			.addAttachmentOption(opt => opt.setName("attachment").setDescription("The card's image").setRequired(true)))
		.addSubcommand(cmd => cmd
			.setName("droppable")
			.setDescription("Allow an existing card to be droppable or not")
			.addStringOption(opt => opt.setName("id").setDescription("The card's id").setRequired(true).setAutocomplete(true)))
		.addSubcommand(cmd => cmd
			.setName("delete")
			.setDescription("Delete an existing card by ID")
			.addStringOption(opt => opt.setName("id").setDescription("The card's id").setRequired(true).setAutocomplete(true))),
	/**
	 * @param {ChatInputCommandInteraction} interaction 
	 */
	run: async (interaction) => {
		const embed = new EmbedBuilder().setColor(config.theme).setTimestamp();
		const mongo = new MongoCard();
		const command = interaction.options.getSubcommand();
		if (command == "upload") {
			const name = interaction.options.getString("name");
			const group = interaction.options.getString("group");
			const tier = interaction.options.getString("tier");
			const id = interaction.options.getString("id");
			const era = interaction.options.getString("era");
			const droppable = interaction.options.getBoolean("droppable");
			const attachment = interaction.options.getAttachment("attachment");

			const card = await mongo.get(id);
			if (card) return interaction.reply({ embeds: [embed.setDescription("There is already an existing card with that ID.")], ephemeral: true });

			embed
				.setTitle("Card Verification")
				.setDescription("Please confirm before uploading.")
				.setFields(
					{ name: "Name", value: name, inline: true },
					{ name: "Group", value: group, inline: true },
					{ name: "ID", value: id.toUpperCase(), inline: true },
					{ name: "Tier", value: config.tiers.find((_, i) => i == tier).name, inline: true },
					{ name: "Era", value: era, inline: true },
					{ name: "Droppable", value: droppable ? "Yes" : "No", inline: true })
				.setImage(attachment.url);

			const components = new ActionRowBuilder().setComponents(
				new ButtonBuilder().setCustomId("upload").setLabel("Upload").setStyle(ButtonStyle.Primary),
				new ButtonBuilder().setCustomId("cancel").setLabel("Cancel").setStyle(ButtonStyle.Secondary));

			const message = await interaction.reply({ embeds: [embed], components: [components], fetchReply: true });
			const component = await message.awaitMessageComponent();
			component.deferUpdate();
			if (component?.customId != "upload")
				return interaction.editReply({ embeds: [new EmbedBuilder().setColor("Red").setTitle("Card Verification").setDescription("Card creation canceled.")], components: [] });

			const response = await fetch(attachment.url);
			const buffer = Buffer.from(await response.arrayBuffer());
			await mongo.create({ id: id.toUpperCase(), name, group, era, tier, droppable, buffer });
			return interaction.editReply({ embeds: [embed.setColor("Green").setDescription("Card successfully uploaded!")], components: [] });
		}
		if (command == "droppable") {
			const id = interaction.options.getString("id");
			const card = await mongo.get(id);
			if (!card) return interaction.reply({ embeds: [embed.setDescription("There is no card with that ID.")], ephemeral: true });

			mongo.update(id, { droppable: !card.droppable });
			if (card.droppable) embed.setDescription(`**${id}** is no longer droppable. They are no longer normally retrievable and can only be given by staff members.`);
			else embed.setDescription(`**${id}** is now droppable. They can be retrieved normally through commands.`);
			return interaction.reply({ embeds: [embed] });
		}
		if (command == "delete") {
			const id = interaction.options.getString("id");
			const card = await mongo.delete(id, new MongoInventory());
			if (!card) return interaction.reply({ embeds: [embed.setDescription("There is no card with that ID.")], ephemeral: true });
			return interaction.reply({ embeds: [embed.setDescription(`**${id}** has been successfully deleted from the database.`)] });
		}
	},
	/**
	 * @param {AutocompleteInteraction} interaction
	 */
	autocomplete: async (interaction) => {
		const mongo = new MongoCard();
		const cards = (await mongo.model.find()).map(c => c.id);
		const value = interaction.options.getFocused();
		await interaction.respond(cards.filter(c => c.startsWith(value.toUpperCase())).map(id => ({ name: id, value: id })));
	}
};