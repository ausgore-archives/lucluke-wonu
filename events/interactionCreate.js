const { Interaction } = require("discord.js");

module.exports = {
	event: "interactionCreate",
	/**
	 * @param {Interaction} interaction 
	 */
	on: async (interaction) => {
		if (interaction.isCommand()) {
			const command = interaction.client.commands.get(interaction.commandName);
			if (command) command.run(interaction);
		}
		else if (interaction.isAutocomplete()) {
			const command = interaction.client.commands.get(interaction.commandName);
			if (command) command.autocomplete(interaction);
		}
	}
}