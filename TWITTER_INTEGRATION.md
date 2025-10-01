# Twitter API Integration Guide

This file contains instructions for switching from manual input to Twitter API integration once your X account is in good standing.

## Current State: Manual Input Mode
- Users log in with email/name
- Manual entry of daily replies and follower count
- All data is stored the same way in Supabase

## Future: Twitter API Mode

### 1. Update Authentication (pages/api/auth/[...nextauth].js)

Replace the CredentialsProvider with TwitterProvider:

```javascript
import TwitterProvider from 'next-auth/providers/twitter'

// Replace the current provider with:
TwitterProvider({
  clientId: process.env.TWITTER_CLIENT_ID,
  clientSecret: process.env.TWITTER_CLIENT_SECRET,
  version: "2.0"
})
```

### 2. Update Login Button (app/page.js)

Change the sign-in call:
```javascript
// Change from:
onClick={() => signIn()}

// To:
onClick={() => signIn('twitter')}
```

### 3. Update API Route (app/api/logs/route.js)

Replace the manual input logic with Twitter API calls:

```javascript
// Get Twitter access token from session
const accessToken = session.accessToken

// Fetch follower count
const userResponse = await fetch('https://api.twitter.com/2/users/me?user.fields=public_metrics', {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
})

const userData = await userResponse.json()
const followerCount = userData.data?.public_metrics?.followers_count || 0

// Fetch tweets to count replies
const yesterday = new Date()
yesterday.setDate(yesterday.getDate() - 1)
const startTime = yesterday.toISOString()

const tweetsResponse = await fetch(
  `https://api.twitter.com/2/users/${userData.data.id}/tweets?tweet.fields=referenced_tweets&start_time=${startTime}&max_results=100`,
  {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  }
)

const tweetsData = await tweetsResponse.json()
const repliesCount = tweetsData.data?.filter(tweet => 
  tweet.referenced_tweets?.some(ref => ref.type === 'replied_to')
).length || 0
```

### 4. Environment Variables

Add to .env.local:
```
TWITTER_CLIENT_ID=your_twitter_client_id
TWITTER_CLIENT_SECRET=your_twitter_client_secret
```

### 5. Update UI (app/page.js)

Remove the manual input fields and revert to the automatic "Log Today's Progress" button.

## Benefits of This Architecture

1. **Database stays the same** - No migration needed
2. **UI can be easily switched** - Just remove manual input fields
3. **API route has clear separation** - Easy to swap data sources
4. **Users won't lose data** - Everything remains compatible

## Testing the Switch

1. Set up Twitter Developer account
2. Create app with OAuth 2.0
3. Update environment variables
4. Make the code changes above
5. Test with a single user first

This modular approach makes the transition seamless when you're ready!