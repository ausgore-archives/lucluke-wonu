const { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, Collection } = require("discord.js");
const { Canvas, Image } = require("@napi-rs/canvas");
const config = require("../config");
const MongoCard = require("../database/MongoCard");
const { promises: fs } = require("fs");
const MongoInventory = require("../database/MongoInventory");
const MongoUser = require("../database/MongoUser");
const humanize = require("humanize-duration");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("drop")
		.setDescription("Drop a set of 3 cards")
		.setDMPermission(false),
	/**
	 * @param {ChatInputCommandInteraction} interaction 
	 */
	run: async (interaction) => {

		const embed = new EmbedBuilder()
			.setColor(config.theme)
			.setDescription(`${interaction.user} is dropping a set of 3 cards!`);

		const mongoUser = new MongoUser(interaction.user.id);
		const cooldown = await mongoUser.getCooldown("drop");
		if (cooldown > Date.now()) {
			embed
				.setTitle("This command is on cooldown!")
				.setDescription(`**Total cooldown:** \`${config.cooldowns.drop / 60000}\` minutes\n**Time remaining:** ${humanize(cooldown - Date.now(), { delimiter: " and ", round: true }).replace(/\d+/g, n => `\`${n}\``)}`);
			return interaction.reply({ embeds: [embed], ephemeral: true });
		}
		mongoUser.setCooldown("drop", config.cooldowns.drop);

		await interaction.deferReply();

		const mongo = new MongoCard();
		const cards = await mongo.getCards(3);

		const component = new ActionRowBuilder().setComponents(
			new ButtonBuilder().setCustomId(cards[0].id).setEmoji("1153061555232055377").setStyle(ButtonStyle.Secondary),
			new ButtonBuilder().setCustomId(cards[1].id).setEmoji("1153061572957184072").setStyle(ButtonStyle.Secondary),
			new ButtonBuilder().setCustomId(cards[2].id).setEmoji("1153061605530148954").setStyle(ButtonStyle.Secondary));

		const gap = 10;
		const canvas = new Canvas(2560, 1100);
		const ctx = canvas.getContext("2d");

		let x = 0;
		for (let i = 0; i < cards.length; i++) {
			const card = cards[i];
			const buffer = await fs.readFile(`images/${card.id}.png`);
			const image = new Image();
			image.src = buffer;
			ctx.drawImage(image, x, 0, (canvas.width - (gap * cards.length)) / cards.length, canvas.height);
			x += ((canvas.width - (gap * cards.length)) / cards.length) + gap;
		}

		const buffer = canvas.toBuffer("image/png");
		const attachment = new AttachmentBuilder(buffer, { name: "image.png" });
		embed.setImage("attachment://image.png");
		const message = await interaction.followUp({ embeds: [embed], files: [attachment], components: [component] });

		const collected = new Collection();
		const collector = message.createMessageComponentCollector({ time: 30_000 });
		collector.on("collect", async i => {
			const mongo = new MongoUser(i.user.id);
			if ([...collected.values()].includes(i.user.id)) 
				return i.reply({ content: "You already claimed a card.", ephemeral: true });

			if (collected.get(i.customId)) 
				return i.reply({ content: "Someone else already claimed this card.", ephemeral: true });

			const cooldown = await mongo.getCooldown("claim");
			if (cooldown > Date.now()) 
				return i.reply({ content: `You need to wait for ${humanize(cooldown - Date.now(), { delimiter: " and ", round: true }).replace(/\d+/g, n => `\`${n}\``)} before claiming a card!`, ephemeral: true });
			mongo.setCooldown("claim", config.cooldowns.claim);

			collected.set(i.customId, i.user.id);
			component.components.find(c => c.data.custom_id == i.customId).setDisabled(true);
			message.edit({ components: [component] });

			new MongoInventory(i.user.id).add(cards.find(c => c.id == i.customId)._id);
			const card = cards.find(c => c.id == i.customId);
			i.reply({ content: `You've picked up *${card.name}*!`, ephemeral: true });
		});
		collector.on("end", async () => {
			component.components.forEach(c => c.setDisabled(true));
			component.addComponents(new ButtonBuilder().setCustomId("nil").setLabel("This drop has expired").setStyle(ButtonStyle.Secondary).setDisabled(true));
			message.edit({ components: [component] });

			embed
				.setTitle("GAME OVER")
				.setDescription(cards.map((card, i) => `${i}. __${card.name}__ [${card.era}] // ${card.id} ${config.tiers.find((_, i) => i == card.tier)?.emoji}\nGroup : ${card.group}\nClaimed by ${collected.get(card.id) ? `<@${collected.get(card.id)}>` : "no one."}`).join("\n\n"))
			interaction.followUp({ embeds: [embed] });
		});
	}
}