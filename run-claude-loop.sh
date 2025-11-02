#!/bin/bash

# Script to continuously run Claude Code with next-todo.prompt.md
# This loops forever, executing the prompt file each iteration

PROMPT_FILE="next-todo.prompt.md"
COUNTER=1

echo "Starting Claude Code loop..."
echo "Using prompt file: $PROMPT_FILE"
echo "Press Ctrl+C to stop"
echo "================================"

while true; do
    echo ""
    echo "🔄 Iteration #$COUNTER - $(date '+%Y-%m-%d %H:%M:%S')"
    echo "--------------------------------"
    
    # Check if prompt file exists
    if [ ! -f "$PROMPT_FILE" ]; then
        echo "❌ Error: Prompt file '$PROMPT_FILE' not found!"
        echo "Please create the file and try again."
        exit 1
    fi
    
    # Run Claude in print mode with the prompt file content piped via stdin
    cat "$PROMPT_FILE" | claude -p --dangerously-skip-permissions
    
    EXIT_CODE=$?
    
    if [ $EXIT_CODE -ne 0 ]; then
        echo "⚠️  Claude exited with code $EXIT_CODE"
    else
        echo "✅ Iteration completed successfully"
    fi
    
    # Increment counter
    COUNTER=$((COUNTER + 1))
    
    # Optional: Add a small delay between iterations (uncomment if needed)
    # sleep 2
done
