const WebSocket = require('ws');

// Test the relay server
async function testRelay() {
  console.log('Testing WebSocket relay server...');
  
  // Test client 1
  const client1 = new WebSocket('ws://localhost:8080');
  
  client1.on('open', () => {
    console.log('Client 1 connected');
    
    // Send HELLO message
    client1.send(JSON.stringify({
      type: 'HELLO',
      payload: {
        userId: 'user1',
        name: 'Alice',
        docId: 'doc1',
        lastKnownVersion: 0
      }
    }));
  });
  
  client1.on('message', (data) => {
    const message = JSON.parse(data);
    console.log('Client 1 received:', message);
    
    if (message.type === 'SNAPSHOT') {
      console.log('Client 1 received snapshot');
    }
  });
  
  // Test client 2
  setTimeout(() => {
    const client2 = new WebSocket('ws://localhost:8080');
    
    client2.on('open', () => {
      console.log('Client 2 connected');
      
      // Send HELLO message
      client2.send(JSON.stringify({
        type: 'HELLO',
        payload: {
          userId: 'user2',
          name: 'Bob',
          docId: 'doc1',
          lastKnownVersion: 0
        }
      }));
    });
    
    client2.on('message', (data) => {
      const message = JSON.parse(data);
      console.log('Client 2 received:', message);
    });
    
    // Send an operation
    setTimeout(() => {
      client2.send(JSON.stringify({
        type: 'OP',
        payload: {
          opId: 'op1',
          userId: 'user2',
          docId: 'doc1',
          baseVersion: 0,
          kind: 'insert',
          index: 0,
          text: 'Hello World!'
        }
      }));
    }, 1000);
    
  }, 1000);
  
  // Cleanup after test
  setTimeout(() => {
    console.log('Test completed, closing connections...');
    client1.close();
    process.exit(0);
  }, 5000);
}

// Run test
testRelay().catch(console.error);
