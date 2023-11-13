const { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AutocompleteInteraction, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require("discord.js");
const MongoInventory = require("../database/MongoInventory");
const config = require("../config");
const chunks = require("chunk-array").chunks;

module.exports = {
	data: new SlashCommandBuilder()
		.setName("inv")
		.setDescription("Shows inventory")
		.addUserOption(opt => opt.setName("user").setDescription("The user to view"))
		.addStringOption(opt => opt.setName("id").setDescription("Filter by card ID").setAutocomplete(true)),
	/**
	 * @param {ChatInputCommandInteraction} interaction 
	 */
	run: async (interaction) => {
		const filter = {
			id: interaction.options.getString("id")
		};

		const limit = 4;
		let page = 0;
		const user = interaction.options.getMember("user")?.user ?? interaction.user;
		const mongo = new MongoInventory(user.id);
		const cards = await mongo.get({ filter });
		cards.sort((a, b) => a.card.name.localeCompare(b.card.name));

		let pages = chunks(cards, limit);
		let inventory = pages[page];

		const buttons = new ActionRowBuilder().setComponents(
			new ButtonBuilder().setCustomId("left").setEmoji("1172529797679829023").setStyle(ButtonStyle.Secondary).setDisabled(true),
			new ButtonBuilder().setCustomId("page").setLabel(`Page 1 / ${pages.length}`).setStyle(ButtonStyle.Secondary).setDisabled(true),
			new ButtonBuilder().setCustomId("right").setEmoji("1172529775152222208").setStyle(ButtonStyle.Secondary).setDisabled(pages.length == 1));

		const menu = new ActionRowBuilder().setComponents(new StringSelectMenuBuilder()
			.setCustomId("sort")
			.setOptions(
				new StringSelectMenuOptionBuilder().setLabel("Sort by: Idol").setValue("sort-idol").setDefault(),
				new StringSelectMenuOptionBuilder().setLabel("Sort by: Group").setValue("sort-group"),
				new StringSelectMenuOptionBuilder().setLabel("Sort by: Rarity").setValue("sort-rarity"),
				new StringSelectMenuOptionBuilder().setLabel("Sort by: ID").setValue("sort-id")));

		const embed = new EmbedBuilder()
			.setColor(config.theme)
			.setAuthor({ name: `${user.username}'s Inventory`, iconURL: user.displayAvatarURL({ forceStatic: false }) })
			.setTimestamp();
		if (!inventory.length) return interaction.reply({ embeds: [embed.setDescription("This user currently hasn't collected a card yet.")] });

		embed.setDescription(inventory.map((item, i) => `${i + 1}. __${item.card.name}__ [${item.card.era}]\n\n<:wonu_disk:1152129859271807067> **Group** : ${item.card.group}\n<:wonu_diamond:1151257682444042290> **Rarity** : ${config.tiers.find((_, i) => i == item.card.tier).emoji}\n<:wonu_files:1152129823188209675> **ID** : ${item.card.id}`).join("\n\n"));

		const message = await interaction.reply({ embeds: [embed], fetchReply: true, components: [menu, buttons] });

		const collector = message.createMessageComponentCollector({ filter: i => i.user.id == interaction.user.id });
		collector.on("collect", async (i) => {
			await i.deferUpdate();
			if (i.customId == "right") {
				page = page + 1;
				const inventory = pages[page];
				buttons.components[0].setDisabled(false);
				buttons.components[1].setLabel(`Page ${page + 1} / ${pages.length}`);
				buttons.components[2].setDisabled(page == pages.length - 1);
				embed.setDescription(inventory.map((item, i) => `${(page * limit) + i + 1}. __${item.card.name}__ [${item.card.era}]\n\n<:wonu_disk:1152129859271807067> **Group** : ${item.card.group}\n<:wonu_diamond:1151257682444042290> **Rarity** : ${config.tiers.find((_, i) => i == item.card.tier).emoji}\n<:wonu_files:1152129823188209675> **ID** : ${item.card.id}`).join("\n\n"));
				i.editReply({ embeds: [embed], components: [menu, buttons] });
			}
			else if (i.customId == "left") {
				page = page - 1;
				const inventory = pages[page];
				buttons.components[0].setDisabled(!page);
				buttons.components[1].setLabel(`Page ${page + 1} / ${pages.length}`);
				buttons.components[2].setDisabled(false);
				embed.setDescription(inventory.map((item, i) => `${(page * limit) + i + 1}}. __${item.card.name}__ [${item.card.era}]\n\n<:wonu_disk:1152129859271807067> **Group** : ${item.card.group}\n<:wonu_diamond:1151257682444042290> **Rarity** : ${config.tiers.find((_, i) => i == item.card.tier).emoji}\n<:wonu_files:1152129823188209675> **ID** : ${item.card.id}`).join("\n\n"));
				i.editReply({ embeds: [embed], components: [menu, buttons] });
			}
			else if (i.customId == "sort") {
				page = 0;
				const value = i.values[0].split("-")[1];

				menu.setComponents(new StringSelectMenuBuilder()
					.setCustomId("sort")
					.setOptions(
						new StringSelectMenuOptionBuilder().setLabel("Sort by: Idol").setValue("sort-idol").setDefault(value == "idol"),
						new StringSelectMenuOptionBuilder().setLabel("Sort by: Group").setValue("sort-group").setDefault(value == "group"),
						new StringSelectMenuOptionBuilder().setLabel("Sort by: Rarity").setValue("sort-rarity").setDefault(value == "rarity"),
						new StringSelectMenuOptionBuilder().setLabel("Sort by: ID").setValue("sort-id").setDefault(value == "id")));

				switch (value) {
					case "idol":
						cards.sort((a, b) => a.card.name.localeCompare(b.card.name));
						break;
					case "group":
						cards.sort((a, b) => a.card.group.localeCompare(b.card.group));
						break;
					case "rarity":
						cards.sort((a, b) => a.card.tier - b.card.tier);
						break;
					case "id":
						cards.sort((a, b) => a.card.id.localeCompare(b.card.id));
						break;
					default:
						break;
				}

				pages = chunks(cards, limit);
				inventory = pages[page];

				buttons.components[0].setDisabled(true);
				buttons.components[1].setLabel(`Page 1 / ${pages.length}`);
				buttons.components[2].setDisabled(pages.length == 1);

				embed.setDescription(inventory.map((item, i) => `${(page * limit) + i + 1}}. __${item.card.name}__ [${item.card.era}]\n\n<:wonu_disk:1152129859271807067> **Group** : ${item.card.group}\n<:wonu_diamond:1151257682444042290> **Rarity** : ${config.tiers.find((_, i) => i == item.card.tier).emoji}\n<:wonu_files:1152129823188209675> **ID** : ${item.card.id}`).join("\n\n"));
				i.editReply({ embeds: [embed], components: [menu, buttons] });
			}
		});
		collector.on("end", async () => {
			buttons.components[0].setDisabled(true);
			buttons.components[2].setDisabled(true);
			message.edit({ components: [menu, buttons] });
		});
	},
	/**
	 * @param {AutocompleteInteraction} interaction 
	 */
	autocomplete: async (interaction) => {
		const mongo = new MongoInventory(interaction.user.id);
		const { name, value } = interaction.options.getFocused(true);
		if (name == "id") {
			const cards = (await mongo.get()).map(c => c.card);
			await interaction.respond(cards.filter(c => c.id.toLowerCase().includes(value.toLowerCase())).map(c => ({ name: c.id, value: c.id })));
		}
	}
}