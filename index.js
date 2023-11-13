const { Client, Collection, REST, Routes } = require("discord.js");
const config = require("./config");
const mongoose = require("mongoose");
const register = require("./utils/register");
const path = require("path");

const client = new Client({
	intents: ["Guilds"]
});
client.commands = new Collection();

client.once("ready", async () => {
	console.log(`Logged in as \u001b[32m${client.user.tag}\u001b[0m. Please wait for me to reload my commands.`);

	await register(`${__dirname}/commands`, client);
	await register(`${__dirname}/events`, client);

	const rest = new REST({ version: "10" }).setToken(config.token);
	const commands = client.commands.map(c => c.data);
	console.log(" - Clearing existing \u001b[34;1mapplication (/) commands\u001b[0m...");
	await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
	console.log(" - Successfully reloaded \u001b[34;1mapplication (/) commands\u001b[0m.");
	console.log(" - Attempting to connect to the database...");
	const connection = await mongoose.connect(config.connection).catch(() => null);
	if (connection) console.log("Successfully connected to the database. \u001b[32mYou may now freely use the bot\u001b[0m.");
	else {
		console.log("Failed to connect to the database, please ensure that the connection string is correct.");
		process.exit();
	}
});

client.login(config.token);