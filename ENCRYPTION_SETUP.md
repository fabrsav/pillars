# Groq API Key Encryption Setup

This system allows you to store your Groq API key in an encrypted format, requiring a password to decrypt it.

## Setup Instructions

### Step 1: Set Your Password

Edit `encrypt-once.js` and change this line:
```javascript
const PASSWORD = 'YOUR_SECURE_PASSWORD_HERE'; // Change this to your password
```

Choose a strong password (at least 8 characters). You will need this password every time the server starts.

### Step 2: Generate Encrypted Key

Run the encryption script:
```bash
node encrypt-once.js
```

This will output encrypted key data in JSON format.

### Step 3: Update groq-key-manager.js

Copy the JSON output from Step 2 and paste it into `groq-key-manager.js`, replacing the empty `ENCRYPTED_KEY` object:

```javascript
const ENCRYPTED_KEY = {
  salt: "...",     // Paste the values here
  iv: "...",
  encrypted: "...",
  authTag: "..."
};
```

### Step 4: Configure Password for Automatic Decryption

You have three options:

#### Option A: Environment Variable (Recommended)
Set the `GROQ_KEY_PASSWORD` environment variable before starting the server:

**Windows (PowerShell):**
```powershell
$env:GROQ_KEY_PASSWORD="your_password_here"
node server.js
```

**Windows (Command Prompt):**
```cmd
set GROQ_KEY_PASSWORD=your_password_here
node server.js
```

**Linux/Mac:**
```bash
export GROQ_KEY_PASSWORD="your_password_here"
node server.js
```

#### Option B: Create a Startup Script
Create a file `start-with-key.bat` (Windows) or `start-with-key.sh` (Linux/Mac):

**Windows (start-with-key.bat):**
```batch
@echo off
set GROQ_KEY_PASSWORD=your_password_here
npm run dev
```

**Linux/Mac (start-with-key.sh):**
```bash
#!/bin/bash
export GROQ_KEY_PASSWORD="your_password_here"
npm run dev
```

Make it executable (Linux/Mac):
```bash
chmod +x start-with-key.sh
```

#### Option C: Enter Password in UI
If no environment variable is set, the UI will show a password prompt where you can enter your password to decrypt the key.

## Usage

1. Start the server (using one of the methods above)
2. If the password is correct, the key will be automatically decrypted
3. The decrypted key is stored in memory and used for all AI features
4. You won't be asked for the key again during this session

## Security Notes

- The encrypted key is stored in `groq-key-manager.js`
- The password is never stored on disk (only in memory or environment variables)
- Use AES-256-GCM encryption with PBKDF2 key derivation (100,000 iterations)
- Keep your password safe - if you lose it, you'll need to re-encrypt the key
- Don't commit your password to version control

## Troubleshooting

**"NO_ENCRYPTED_KEY" error:**
- You haven't completed Step 3 (updating ENCRYPTED_KEY in groq-key-manager.js)

**"INVALID_PASSWORD" error:**
- The password is incorrect
- Check that you're using the same password you used in encrypt-once.js

**Key not working:**
- The original Groq API key may have expired or been revoked
- Generate a new key from Groq and re-run the encryption process
