const WebSocket = require('ws');

console.log('🚀 Starting collaborative editing demonstration...\n');

// Simulate two clients editing the same document
async function demonstrateCollaboration() {
  console.log('📝 Creating two clients for collaborative editing...\n');
  
  // Client 1: Alice
  const alice = new WebSocket('ws://localhost:8080');
  
  alice.on('open', () => {
    console.log('👩 Alice connected to the server');
    
    // Alice joins the document
    alice.send(JSON.stringify({
      type: 'HELLO',
      payload: {
        userId: 'alice123',
        name: 'Alice',
        docId: 'demo-doc',
        lastKnownVersion: 0
      }
    }));
  });
  
  alice.on('message', (data) => {
    const message = JSON.parse(data);
    console.log('📨 Alice received:', message.type);
    
    if (message.type === 'SNAPSHOT') {
      console.log('📋 Alice received document snapshot');
    } else if (message.type === 'OP') {
      console.log('✏️  Alice received operation from Bob:', message.payload.text);
    } else if (message.type === 'PRESENCE') {
      console.log('👥 Alice received presence update from Bob');
    }
  });
  
  // Client 2: Bob
  setTimeout(() => {
    const bob = new WebSocket('ws://localhost:8080');
    
    bob.on('open', () => {
      console.log('👨 Bob connected to the server');
      
      // Bob joins the same document
      bob.send(JSON.stringify({
        type: 'HELLO',
        payload: {
          userId: 'bob456',
          name: 'Bob',
          docId: 'demo-doc',
          lastKnownVersion: 0
        }
      }));
    });
    
    bob.on('message', (data) => {
      const message = JSON.parse(data);
      console.log('📨 Bob received:', message.type);
      
      if (message.type === 'SNAPSHOT') {
        console.log('📋 Bob received document snapshot');
      } else if (message.type === 'OP') {
        console.log('✏️  Bob received operation from Alice:', message.payload.text);
      } else if (message.type === 'PRESENCE') {
        console.log('👥 Bob received presence update from Alice');
      }
    });
    
    // Bob starts typing
    setTimeout(() => {
      console.log('\n✍️  Bob starts typing...');
      bob.send(JSON.stringify({
        type: 'PRESENCE',
        payload: {
          userId: 'bob456',
          name: 'Bob',
          sessionId: 'bob-session-1',
          cursor: 0
        }
      }));
      
      // Bob sends an operation
      setTimeout(() => {
        console.log('📝 Bob sends: "Hello from Bob!"');
        bob.send(JSON.stringify({
          type: 'OP',
          payload: {
            opId: 'op1',
            userId: 'bob456',
            docId: 'demo-doc',
            baseVersion: 0,
            kind: 'insert',
            index: 0,
            text: 'Hello from Bob!'
          }
        }));
        
        // Alice responds
        setTimeout(() => {
          console.log('📝 Alice sends: "Hi Bob! Nice to meet you!"');
          alice.send(JSON.stringify({
            type: 'OP',
            payload: {
              opId: 'op2',
              userId: 'alice123',
              docId: 'demo-doc',
              baseVersion: 1,
              kind: 'insert',
              index: 16,
              text: ' Hi Alice! Nice to meet you!'
            }
          }));
          
          // Show final state
          setTimeout(() => {
            console.log('\n🎉 Collaboration demonstration completed!');
            console.log('📄 Final document should contain both messages');
            console.log('🔄 Both clients should have synchronized state');
            
            // Cleanup
            alice.close();
            bob.close();
            process.exit(0);
          }, 2000);
          
        }, 1000);
        
      }, 1000);
      
    }, 1000);
    
  }, 1000);
}

// Run the demonstration
demonstrateCollaboration().catch(console.error);
