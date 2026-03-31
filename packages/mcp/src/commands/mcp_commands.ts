import type { Command } from 'commander'
import chalk from 'chalk'
import { bootstrap, shutdown } from '@strav/cli'
import McpManager from '../mcp_manager.ts'

export function register(program: Command): void {
  program
    .command('mcp:serve')
    .description('Start the MCP server in stdio mode (for Claude Desktop, etc.)')
    .action(async () => {
      let db
      try {
        const { db: database, config } = await bootstrap()
        db = database

        new McpManager(config)

        // Load user registration file
        const registerPath = McpManager.config.register
        if (registerPath) {
          await import(`${process.cwd()}/${registerPath}`)
        }

        const tools = McpManager.registeredTools()
        const resources = McpManager.registeredResources()
        const prompts = McpManager.registeredPrompts()

        // Log to stderr (stdout is the MCP protocol channel)
        console.error(
          chalk.dim(
            `MCP server starting (${tools.length} tools, ${resources.length} resources, ${prompts.length} prompts)`
          )
        )

        const { serveStdio } = await import('../transports/stdio.ts')
        await serveStdio()

        console.error(chalk.dim('MCP server closed.'))
      } catch (err) {
        console.error(chalk.red(`Error: ${err instanceof Error ? err.message : err}`))
        process.exit(1)
      } finally {
        McpManager.reset()
        if (db) await shutdown(db)
      }
    })

  program
    .command('mcp:list')
    .description('List all registered MCP tools, resources, and prompts')
    .action(async () => {
      let db
      try {
        const { db: database, config } = await bootstrap()
        db = database

        new McpManager(config)

        // Load user registration file
        const registerPath = McpManager.config.register
        if (registerPath) {
          await import(`${process.cwd()}/${registerPath}`)
        }

        const tools = McpManager.registeredTools()
        const resources = McpManager.registeredResources()
        const prompts = McpManager.registeredPrompts()

        console.log(chalk.bold('\nMCP Server Registry\n'))

        // Tools
        console.log(chalk.cyan(`Tools (${tools.length}):`))
        if (tools.length === 0) {
          console.log(chalk.dim('  (none)'))
        } else {
          for (const name of tools) {
            const reg = McpManager.getToolRegistration(name)!
            console.log(`  ${chalk.green(name)} ${chalk.dim(reg.description ?? '')}`)
          }
        }
        console.log()

        // Resources
        console.log(chalk.cyan(`Resources (${resources.length}):`))
        if (resources.length === 0) {
          console.log(chalk.dim('  (none)'))
        } else {
          for (const uri of resources) {
            const reg = McpManager.getResourceRegistration(uri)!
            console.log(`  ${chalk.green(uri)} ${chalk.dim(reg.description ?? '')}`)
          }
        }
        console.log()

        // Prompts
        console.log(chalk.cyan(`Prompts (${prompts.length}):`))
        if (prompts.length === 0) {
          console.log(chalk.dim('  (none)'))
        } else {
          for (const name of prompts) {
            const reg = McpManager.getPromptRegistration(name)!
            console.log(`  ${chalk.green(name)} ${chalk.dim(reg.description ?? '')}`)
          }
        }
        console.log()
      } catch (err) {
        console.error(chalk.red(`Error: ${err instanceof Error ? err.message : err}`))
        process.exit(1)
      } finally {
        McpManager.reset()
        if (db) await shutdown(db)
      }
    })
}
