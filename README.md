# Server protocol

## TL;DR
Example of typical websocket traffic:
```
> create
< GAME_ID
> join GAME_ID PLAYER_NAME
< PLAYER_INDEX PLAYER_KEY PLAYER_COUNT WIDTH HEIGHT
...
< 0 0 0000000000000000 0000000000000000
> 4 PLAYER_KEY
< 1 1 0000000000001000 0000000000001000
< 2 0 0000000000011000 0000000000021000
```


## Error messages
All error messages start with the keyword `error `.


# Running the server
`npm i`
`npm run start`