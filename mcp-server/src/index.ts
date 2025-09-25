#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { FoodWasteService } from './services/food-waste.service.js';
import { AIService } from './services/ai.service.js';
import { DatabaseService } from './services/database.service.js';

const server = new Server(
  {
    name: 'food-waste-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      resources: {},
      tools: {},
    },
  }
);

// Initialize services
const databaseService = new DatabaseService();
const aiService = new AIService();
const foodWasteService = new FoodWasteService(databaseService, aiService);

// Tool schemas
const GetFoodInventorySchema = z.object({
  user_id: z.number(),
  status: z.enum(['active', 'consumed', 'expired', 'disposed']).optional(),
  category_id: z.number().optional(),
  expiring_soon: z.boolean().optional(),
});

const AddFoodItemSchema = z.object({
  user_id: z.number(),
  name: z.string(),
  category_id: z.number(),
  quantity: z.number(),
  unit: z.string(),
  purchase_date: z.string(),
  expiry_date: z.string(),
  storage_location: z.enum(['冷蔵庫', '冷凍庫', '常温', 'その他']).optional(),
  barcode: z.string().optional(),
  notes: z.string().optional(),
});

const GetRecipeSuggestionsSchema = z.object({
  user_id: z.number(),
  ingredient_preferences: z.array(z.string()).optional(),
  dietary_restrictions: z.array(z.string()).optional(),
  max_recipes: z.number().default(5),
});

const GenerateShoppingListSchema = z.object({
  user_id: z.number(),
  recipe_ids: z.array(z.number()).optional(),
});

const GetStorageAdviceSchema = z.object({
  food_name: z.string(),
  category: z.string().optional(),
});

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'get_food_inventory',
        description: 'Get user\'s food inventory with optional filtering',
        inputSchema: GetFoodInventorySchema,
      },
      {
        name: 'add_food_item',
        description: 'Add a new food item to inventory',
        inputSchema: AddFoodItemSchema,
      },
      {
        name: 'update_food_status',
        description: 'Update food item status (consumed, expired, disposed)',
        inputSchema: z.object({
          user_id: z.number(),
          food_id: z.number(),
          status: z.enum(['consumed', 'expired', 'disposed']),
        }),
      },
      {
        name: 'get_recipe_suggestions',
        description: 'Get AI-powered recipe suggestions based on available ingredients',
        inputSchema: GetRecipeSuggestionsSchema,
      },
      {
        name: 'generate_shopping_list',
        description: 'Generate shopping list based on low inventory and recipe needs',
        inputSchema: GenerateShoppingListSchema,
      },
      {
        name: 'get_storage_advice',
        description: 'Get storage tips and advice for specific foods',
        inputSchema: GetStorageAdviceSchema,
      },
      {
        name: 'scan_barcode',
        description: 'Process barcode scan and retrieve product information',
        inputSchema: z.object({
          barcode: z.string(),
        }),
      },
      {
        name: 'get_expiry_alerts',
        description: 'Get foods that are expiring soon',
        inputSchema: z.object({
          user_id: z.number(),
          days_ahead: z.number().default(3),
        }),
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'get_food_inventory': {
        const params = GetFoodInventorySchema.parse(args);
        const inventory = await foodWasteService.getFoodInventory(params);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(inventory, null, 2),
            },
          ],
        };
      }

      case 'add_food_item': {
        const params = AddFoodItemSchema.parse(args);
        const food = await foodWasteService.addFoodItem(params);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(food, null, 2),
            },
          ],
        };
      }

      case 'update_food_status': {
        const params = z.object({
          user_id: z.number(),
          food_id: z.number(),
          status: z.enum(['consumed', 'expired', 'disposed']),
        }).parse(args);

        const result = await foodWasteService.updateFoodStatus(
          params.user_id,
          params.food_id,
          params.status
        );

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'get_recipe_suggestions': {
        const params = GetRecipeSuggestionsSchema.parse(args);
        const suggestions = await foodWasteService.getRecipeSuggestions(params);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(suggestions, null, 2),
            },
          ],
        };
      }

      case 'generate_shopping_list': {
        const params = GenerateShoppingListSchema.parse(args);
        const shoppingList = await foodWasteService.generateShoppingList(params);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(shoppingList, null, 2),
            },
          ],
        };
      }

      case 'get_storage_advice': {
        const params = GetStorageAdviceSchema.parse(args);
        const advice = await foodWasteService.getStorageAdvice(params);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(advice, null, 2),
            },
          ],
        };
      }

      case 'scan_barcode': {
        const params = z.object({ barcode: z.string() }).parse(args);
        const productInfo = await foodWasteService.scanBarcode(params.barcode);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(productInfo, null, 2),
            },
          ],
        };
      }

      case 'get_expiry_alerts': {
        const params = z.object({
          user_id: z.number(),
          days_ahead: z.number().default(3),
        }).parse(args);

        const alerts = await foodWasteService.getExpiryAlerts(
          params.user_id,
          params.days_ahead
        );

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(alerts, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
      isError: true,
    };
  }
});

// List available resources
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: 'food-categories://list',
        mimeType: 'application/json',
        name: 'Food Categories',
        description: 'List of all food categories',
      },
      {
        uri: 'storage-tips://list',
        mimeType: 'application/json',
        name: 'Storage Tips',
        description: 'Food storage tips and best practices',
      },
    ],
  };
});

// Handle resource reads
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  try {
    switch (uri) {
      case 'food-categories://list': {
        const categories = await databaseService.getFoodCategories();
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(categories, null, 2),
            },
          ],
        };
      }

      case 'storage-tips://list': {
        const tips = await databaseService.getStorageTips();
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(tips, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown resource: ${uri}`);
    }
  } catch (error) {
    throw new Error(`Failed to read resource ${uri}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
});

/**
 * Starts the MCP server and connects it to a standard I/O transport.
 *
 * Establishes a StdioServerTransport, connects the exported server instance to it, and writes a startup message to stderr.
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Food Waste MCP Server running on stdio');
}

if (require.main === module) {
  main().catch(console.error);
}

export { server };