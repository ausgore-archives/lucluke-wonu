const { Client } = require("discord.js");
const { promises: fs } = require("fs");
const path = require("path");

/**
 * @param {string} dir 
 * @param {Client} client 
 */
const register = async (dir, client) => {
	const folder = await fs.readdir(path.join(dir));
	for (const file of folder) {
		const stat = await fs.lstat(path.join(dir, file));
		if (stat.isDirectory()) this.register(path.join(dir, file), client);
		else if (file.endsWith(".js")) {
			const data = require(`${path.join(dir, file)}`);
			if (data.data) client.commands.set(data.data.name, data);
			else client.on(data.event, data.on.bind(this));
		}
	}
}

module.exports = register;