# Gourde
An GUI applcation to launch gource, alternatives either dont do a rendering that you can examine or do a timestep animation

## TODO


- Generate gource bin for linux
- Create gource struct that is accessed through mods
    - These mods are separate for windows and linux 

- Setup for linux / macos test
- FFMPEG to make the videos (windows just include the binary) 
    - ~~Link and use ffmpeg~~
    - (figure out how to use gitlfs)
    - Handle showing user console output


- link the gource source as a submodule instead 
- linux/ macos record videos using preinstalled ffmpeg or tell user to install ffpmeg
- useError and handle invoke errors 
- styles
- Fix wrong unlaunchable directory (no git folder)


- Git-rs rust crate to temp download and host the repos, possibly logins
- fix launching program on wrong monitor

- Easy kill child funtion usage


- ~~File dialog to open the location~~

- Lower scope for fs delete to only temp stuff