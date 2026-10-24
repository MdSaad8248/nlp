async function runTest(testName, payload) {
  console.log(`\n========================================`);
  console.log(`RUNNING: ${testName}`);
  console.log(`PROMPT: "${payload.message}"`);
  console.log(`========================================`);
  
  const res = await fetch('http://localhost:3000/api/assistant/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    console.error(`HTTP ERROR ${res.status}: ${res.statusText}`);
    return { success: false };
  }

  const rawText = await res.text();
  let fullText = '';
  let events = [];
  const lines = rawText.split('\n');
  let currentEvent = '';

  for (const line of lines) {
    if (line.startsWith('event: ')) {
      currentEvent = line.slice(7).trim();
    } else if (line.startsWith('data: ')) {
      try {
        const parsed = JSON.parse(line.slice(6));
        events.push(parsed);
        if (currentEvent === 'token' && parsed.text) {
          fullText += parsed.text;
        } else if (currentEvent === 'tool_start') {
          console.log(`[TOOL START] -> ${parsed.toolName}: ${parsed.label}`);
        } else if (currentEvent === 'tool_result') {
          console.log(`[TOOL RESULT] -> ${parsed.toolName}: Success=${parsed.result?.success}`);
        }
      } catch (e) {}
    }
  }

  console.log(`\nRESPONSE SUMMARY (First 200 chars):\n${fullText.slice(0, 200)}...`);
  return { success: true, text: fullText, events };
}

async function runAll() {
  // Setup a session first
  const sessRes = await fetch('http://localhost:3000/api/assistant/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Comprehensive Verification' })
  });
  const sessData = await sessRes.json();
  const sessionId = sessData.session.id;
  console.log(`Created test session: ${sessionId}`);

  // TEST 1
  await runTest('TEST 1: Due this week', {
    conversationId: sessionId,
    message: 'What do I have due this week?'
  });

  // TEST 2
  await runTest('TEST 2: Priority task', {
    conversationId: sessionId,
    message: 'Which task should I do first?'
  });

  // TEST 3
  await runTest('TEST 3: Recent changes', {
    conversationId: sessionId,
    message: 'What changed recently?'
  });

  // TEST 4
  await runTest('TEST 4: Priority reasoning', {
    conversationId: sessionId,
    message: 'Why is my NLP project high priority?'
  });

  // TEST 5
  const t5 = await runTest('TEST 5: Mutation - Mark task completed', {
    conversationId: sessionId,
    message: 'Mark my NLP project as completed.'
  });

  // TEST 6
  const t6 = await runTest('TEST 6: Mutation - Create reminder', {
    conversationId: sessionId,
    message: 'Create a reminder for tomorrow at 7 PM.'
  });

  // TEST 7: Multi-turn
  console.log(`\nStarting TEST 7 (Multi-turn session)...`);
  const sess2Res = await fetch('http://localhost:3000/api/assistant/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Multi-turn Context Test' })
  });
  const sess2Data = await sess2Res.json();
  const sess2Id = sess2Data.session.id;

  await runTest('TEST 7 (Turn 1): Most urgent task', {
    conversationId: sess2Id,
    message: 'What is my most urgent task?'
  });

  await runTest('TEST 7 (Turn 2): Contextual follow-up', {
    conversationId: sess2Id,
    message: 'Why?'
  });

  console.log('\n========================================');
  console.log('ALL VERIFICATION TESTS COMPLETED');
  console.log('========================================');
}

runAll().catch(console.error);
