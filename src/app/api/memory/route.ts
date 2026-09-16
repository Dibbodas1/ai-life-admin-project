import { NextRequest, NextResponse } from "next/server";
import { getDriveData, saveDriveData, isDemoToken } from "@/lib/drive-db";
import { AgentMemoryEntry } from "@/lib/types";

export const dynamic = "force-dynamic";

// ─── GET: List memories with optional filters ───────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get("Authorization")?.replace("Bearer ", "") || "demo_token";

    if (isDemoToken(token)) {
      return NextResponse.json({ memories: [] });
    }

    const { data } = await getDriveData(token);
    let memories = data.agentMemory || [];

    // Apply filters from query params
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const tag = searchParams.get("tag");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    if (category) {
      memories = memories.filter(m => m.category === category);
    }
    if (tag) {
      memories = memories.filter(m => m.tags.includes(tag.toLowerCase()));
    }
    if (status) {
      memories = memories.filter(m => m.status === status);
    } else {
      // Default: only show active memories
      memories = memories.filter(m => m.status === "active");
    }
    if (search) {
      const searchLower = search.toLowerCase();
      memories = memories.filter(m =>
        m.content.toLowerCase().includes(searchLower) ||
        m.tags.some(t => t.includes(searchLower))
      );
    }

    // Sort by most recently updated
    memories.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    return NextResponse.json({ memories });
  } catch (error) {
    console.error("Memory GET error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// ─── PUT: Update a memory ───────────────────────────────────────────────────

export async function PUT(req: NextRequest) {
  try {
    const token = req.headers.get("Authorization")?.replace("Bearer ", "") || "demo_token";

    if (isDemoToken(token)) {
      return NextResponse.json({ error: "Google Drive not connected" }, { status: 403 });
    }

    const { id, changes } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "Memory ID is required" }, { status: 400 });
    }

    const { data } = await getDriveData(token);
    const memories = data.agentMemory || [];
    const idx = memories.findIndex(m => m._id === id);

    if (idx === -1) {
      return NextResponse.json({ error: "Memory not found" }, { status: 404 });
    }

    // Only allow updating specific fields
    const allowedFields: (keyof AgentMemoryEntry)[] = [
      "content", "category", "confidence", "tags", "status"
    ];

    const sanitizedChanges: Partial<AgentMemoryEntry> = {};
    for (const field of allowedFields) {
      if (field in changes) {
        (sanitizedChanges as any)[field] = changes[field];
      }
    }

    memories[idx] = {
      ...memories[idx],
      ...sanitizedChanges,
      updatedAt: new Date().toISOString(),
    };

    data.agentMemory = memories;
    await saveDriveData(token, data);

    return NextResponse.json({ memory: memories[idx], success: true });
  } catch (error) {
    console.error("Memory PUT error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// ─── DELETE: Remove a memory ────────────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  try {
    const token = req.headers.get("Authorization")?.replace("Bearer ", "") || "demo_token";

    if (isDemoToken(token)) {
      return NextResponse.json({ error: "Google Drive not connected" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Memory ID is required" }, { status: 400 });
    }

    const { data } = await getDriveData(token);
    const memories = data.agentMemory || [];
    const idx = memories.findIndex(m => m._id === id);

    if (idx === -1) {
      return NextResponse.json({ error: "Memory not found" }, { status: 404 });
    }

    // Fully remove from storage
    memories.splice(idx, 1);
    data.agentMemory = memories;
    await saveDriveData(token, data);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Memory DELETE error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// ─── POST: Manually add a memory ────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get("Authorization")?.replace("Bearer ", "") || "demo_token";

    if (isDemoToken(token)) {
      return NextResponse.json({ error: "Google Drive not connected" }, { status: 403 });
    }

    const { content, category, tags } = await req.json();
    if (!content || !content.trim()) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    const { data } = await getDriveData(token);
    const now = new Date().toISOString();

    const newMemory: AgentMemoryEntry = {
      _id: crypto.randomUUID(),
      category: category || "fact",
      content: content.trim(),
      source: "user",
      confidence: 0.95,  // User-created memories get high confidence
      status: "active",
      usageCount: 0,
      createdAt: now,
      updatedAt: now,
      tags: Array.isArray(tags) ? tags.map((t: string) => t.toLowerCase().trim()) : [],
    };

    if (!data.agentMemory) data.agentMemory = [];
    data.agentMemory.push(newMemory);
    await saveDriveData(token, data);

    return NextResponse.json({ memory: newMemory, success: true });
  } catch (error) {
    console.error("Memory POST error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
