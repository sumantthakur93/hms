## Key Findings

Based on my research of the official Vercel AI SDK documentation, here are the comprehensive findings for building an AI chatbot for a Hospital Management System (HMS) with role-based access control:

### 1. **Vercel AI SDK with Google Gemini Setup**

**Installation:**
```bash
npm i @ai-sdk/google
# or
pnpm add @ai-sdk/google
```

**Configuration:**
- Import `google` from `@ai-sdk/google`
- API key defaults to `GOOGLE_GENERATIVE_AI_API_KEY` environment variable
- Can be customized with `createGoogle` for custom settings
- Environment variable setup in `.env.local`:
```env
GOOGLE_GENERATIVE_AI_API_KEY=your_api_key_here
```

**Model Options:**
- `gemini-2.5-flash`: Fast, efficient model with 64K output tokens
- `gemini-1.5-pro`: Larger context window (2M tokens vs 1M for Flash), more expensive
- `gemini-2.0-flash`: Generally more intelligent and cheaper per token

**Basic Usage:**
```typescript
import { google } from '@ai-sdk/google';
import { generateText } from 'ai';

const { text } = await generateText({
  model: google('gemini-2.5-flash'),
  prompt: 'Hello, world!',
});
```

### 2. **useChat React Hook**

**Frontend Setup:**
```typescript
import { useChat } from '@ai-sdk/react';

const { messages, input, handleInputChange, handleSubmit } = useChat();
```

**API Route Structure:**
- Default endpoint: `/api/chat/route.ts`
- Handles `POST` requests
- Receives `UIMessage[]`, converts to `ModelMessage[]`
- Uses `streamText` to generate responses

**Passing Custom Data:**
- `useChat` allows dynamic configuration for headers and body
- Can pass `userId` or other custom data to the API route
- Metadata can be attached to individual messages

### 3. **Tool/Function Calling**

**Tool Definition:**
```typescript
import { tool } from 'ai';
import { z } from 'zod';

const myTool = tool({
  description: 'Tool description',
  inputSchema: z.object({
    param: z.string().describe('Parameter description'),
  }),
  execute: async ({ param }) => {
    // Tool execution logic
    return { result: 'success' };
  },
});
```

**Key Points:**
- Tools require `description`, `inputSchema` (Zod or JSON schema), and optional `execute` function
- `.describe()` can be used on Zod schemas for better model hints
- The LLM uses the tool's `description` and `inputSchema` to decide when to call a tool
- Multi-step tool calling is handled by `ToolLoopAgent` or `stopWhen` configuration
- Prisma can be used for database interactions within tool `execute` functions

### 4. **Role-Based Access Control (RBAC)**

**Method 1: Tool Approval with runtimeContext**
```typescript
import { ToolLoopAgent, tool } from 'ai';
import { z } from 'zod';

const agent = new ToolLoopAgent({
  model: google('gemini-2.5-flash'),
  tools: {
    processPayment: tool({
      inputSchema: z.object({
        amount: z.number(),
        recipient: z.string(),
      }),
      execute: async ({ amount, recipient }) =>
        processPayment({ amount, recipient }),
    }),
  },
  toolApproval: {
    processPayment: async ({ amount }, { runtimeContext }) => {
      if (runtimeContext.role !== 'admin') {
        return { type: 'denied', reason: 'Only admins can send payments' };
      }
      return amount > 1000 ? 'user-approval' : undefined;
    },
  },
});

// Usage with runtimeContext
const result = await agent.generate({
  prompt: 'Process payment',
  runtimeContext: { role: 'admin', userId: 'user_123' },
});
```

**Method 2: Dynamic Tool Filtering with prepareStep**
```typescript
const agent = new ToolLoopAgent({
  model: google('gemini-2.5-flash'),
  tools: {
    // Define all tools
  },
  prepareStep: async ({ runtimeContext }) => {
    // Filter tools based on role
    const roleTools = {
      admin: ['createUser', 'deleteUser', 'viewAllRecords'],
      doctor: ['viewPatientRecords', 'createPrescription'],
      patient: ['viewOwnRecords', 'updateProfile'],
      receptionist: ['scheduleAppointment', 'viewSchedule'],
      labTechnician: ['viewLabOrders', 'updateLabResults'],
    };

    return {
      activeTools: roleTools[runtimeContext.role] || [],
    };
  },
});
```

**Method 3: Dynamic System Instructions with prepareCall**
```typescript
const agent = new ToolLoopAgent({
  model: google('gemini-2.5-flash'),
  callOptionsSchema: z.object({
    userId: z.string(),
    role: z.enum(['admin', 'doctor', 'patient', 'receptionist', 'labTechnician']),
  }),
  instructions: 'You are a helpful hospital management assistant.',
  prepareCall: ({ options, ...settings }) => ({
    ...settings,
    instructions: `
      ${settings.instructions}
      
      User context:
      - Role: ${options.role}
      - User ID: ${options.userId}
      
      Adjust your response based on the user's role and permissions.
    `,
  }),
});

// Usage
const result = await agent.generate({
  prompt: 'Help me with patient records',
  options: {
    userId: 'user_123',
    role: 'doctor',
  },
});
```

### 5. **Runtime Context and Tool Context**

**Context Types:**
- `runtimeContext`: Shared state for the whole generation/agent loop
- `toolsContext`: Per-tool context values keyed by tool name
- Tool `context`: Individual tool context validated by `contextSchema`

**Usage:**
```typescript
const result = await generateText({
  model: google('gemini-2.5-flash'),
  runtimeContext: {
    role: 'doctor',
    userId: 'user_123',
    requestId: 'req_abc',
  },
  toolsContext: {
    searchPatients: {
      apiKey: process.env.API_KEY,
      hospitalId: 'hospital_123',
    },
  },
  tools: {
    searchPatients: tool({
      contextSchema: z.object({
        apiKey: z.string(),
        hospitalId: z.string(),
      }),
      execute: async ({ query }, { context }) => {
        // Access context.apiKey and context.hospitalId
      },
    }),
  },
});
```

### 6. **Security Considerations**

**System Prompts:**
- Use the `instructions` property for system prompts
- Avoid `allowSystemInMessages: true` to prevent prompt injection
- Only trusted server-side code should set system instructions

**Input Validation:**
- `validateUIMessages` can be used on the server to validate incoming UI messages
- Validate against defined schemas for metadata, data parts, and tools

**Policy-Based Approvals:**
- Can externalize policies using Open Policy Agent (OPA)
- Example OPA policy for role-based tool approval:
```rego
package agent.call

default decision := { "decision": "not-applicable" }

# Deny non-admins from destructive operations
decision := { "decision": "deny", "reason": "Admins only" } {
  input.tool.name == "deletePatient"
  input.runtimeContext.role != "admin"
}

# Auto-allow read operations for doctors
decision := { "decision": "allow" } {
  input.tool.name == "viewPatientRecords"
  input.runtimeContext.role == "doctor"
}
```

### 7. **Conversation Management**

**Persistence:**
- `useChat` stores messages in React component state by default
- For persistence, save messages to a database (PostgreSQL with Prisma/Drizzle)
- Use the `onFinish` hook of `streamText` to save generated messages

**Example with Prisma:**
```typescript
const result = await streamText({
  model: google('gemini-2.5-flash'),
  messages,
  onFinish: async ({ response }) => {
    await prisma.message.create({
      data: {
        role: response.role,
        content: response.content,
        conversationId: conversationId,
      },
    });
  },
});
```

### 8. **Next.js App Router Integration**

**API Route Example:**
```typescript
// app/api/chat/route.ts
import { google } from '@ai-sdk/google';
import { streamText } from 'ai';

export const maxDuration = 30; // Extend timeout for Vercel

export async function POST(req: Request) {
  const { messages, userId, role } = await req.json();

  const result = await streamText({
    model: google('gemini-2.5-flash'),
    messages,
    runtimeContext: { userId, role },
    tools: {
      // Define tools
    },
  });

  return result.toDataStreamResponse();
}
```

### 9. **UI Components**

**AI Elements Library:**
- Built on `shadcn/ui` specifically for AI applications
- Components: `Conversation`, `Message`, `MessageResponse`, `PromptInput`, `Reasoning`, `Tool`
- Can render tool call results with custom UI (e.g., appointment cards)

**Tool Call Rendering:**
- Tool calls and results are available as typed tool parts within the `parts` property of assistant messages
- Allows for custom UI rendering based on tool results

### 10. **HMS-Specific Implementation Recommendations**

**Role Definitions:**
Based on the research and existing HMS systems, recommend these 5 roles:
- **Admin**: Full system access, user management, system configuration
- **Doctor**: View/update patient records, create prescriptions, view assigned patients
- **Patient**: View own records, chat with AI, update profile
- **Receptionist**: Schedule appointments, view schedule, patient registration
- **Lab Technician**: View lab orders, update lab results

**Tool Categories by Role:**
```typescript
const roleToolPermissions = {
  admin: [
    'createUser',
    'deleteUser',
    'viewAllRecords',
    'systemConfiguration',
    'viewAnalytics',
  ],
  doctor: [
    'viewPatientRecords',
    'createPrescription',
    'viewAssignedPatients',
    'updateMedicalHistory',
  ],
  patient: [
    'viewOwnRecords',
    'updateProfile',
    'viewAppointments',
    'requestAppointment',
  ],
  receptionist: [
    'scheduleAppointment',
    'viewSchedule',
    'registerPatient',
    'viewPatientInfo',
  ],
  labTechnician: [
    'viewLabOrders',
    'updateLabResults',
    'viewAssignedTests',
  ],
};
```

**Recommended Architecture:**
1. Use `ToolLoopAgent` for complex multi-step operations
2. Use `prepareStep` with `activeTools` for role-based tool filtering
3. Use `runtimeContext` to pass user role and ID
4. Use `toolApproval` for sensitive operations (deletions, payments)
5. Use `prepareCall` for dynamic system instructions based on role
6. Persist conversations with Prisma/PostgreSQL
7. Use Next.js App Router with API routes
8. Set `maxDuration` on API routes for longer operations

### 11. **Environment Setup**

**Required Environment Variables:**
```env
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key
DATABASE_URL=your_postgresql_connection_string
# Optional: For external policy engine
PERMIT_API_KEY=your_permit_api_key
```

**Installation Commands:**
```bash
npm install @ai-sdk/google ai zod prisma @prisma/client
# or
pnpm add @ai-sdk/google ai zod prisma @prisma/client
```

### 12. **Complete Example Structure**

```typescript
// lib/agent.ts
import { ToolLoopAgent, tool } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';

export const hmsAgent = new ToolLoopAgent({
  model: google('gemini-2.5-flash'),
  callOptionsSchema: z.object({
    userId: z.string(),
    role: z.enum(['admin', 'doctor', 'patient', 'receptionist', 'labTechnician']),
  }),
  instructions: 'You are a helpful hospital management assistant.',
  prepareCall: ({ options, ...settings }) => ({
    ...settings,
    instructions: `
      ${settings.instructions}
      
      User Role: ${options.role}
      User ID: ${options.userId}
      
      Adjust your responses based on the user's role and permissions.
      ${options.role === 'doctor' ? 'You can access patient records and create prescriptions.' : ''}
      ${options.role === 'patient' ? 'You can only access your own records.' : ''}
    `,
  }),
  prepareStep: async ({ runtimeContext }) => {
    const roleTools = {
      admin: ['createUser', 'deleteUser', 'viewAllRecords'],
      doctor: ['viewPatientRecords', 'createPrescription'],
      patient: ['viewOwnRecords', 'updateProfile'],
      receptionist: ['scheduleAppointment', 'viewSchedule'],
      labTechnician: ['viewLabOrders', 'updateLabResults'],
    };

    return {
      activeTools: roleTools[runtimeContext.role] || [],
    };
  },
  tools: {
    // Define all tools here
  },
  toolApproval: {
    deleteUser: async ({ userId }, { runtimeContext }) => {
      if (runtimeContext.role !== 'admin') {
        return { type: 'denied', reason: 'Only admins can delete users' };
      }
      return undefined;
    },
  },
});
```

This comprehensive research provides all the necessary information to implement a secure, role-based AI chatbot for a Hospital Management System using Vercel AI SDK with Google Gemini.