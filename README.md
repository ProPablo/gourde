# Gourde
An GUI applcation to launch gource, alternatives either dont do a rendering that you can examine or do a timestep animation

## TODO
- Generate gource bin for linux

- FFMPEG to make the videos (windows just include the binary) 
    - ~~Link and use ffmpeg~~
    - (figure out how to use gitlfs)
    - Handle showing user console output


- linux/ macos record videos using preinstalled ffmpeg or tell user to install ffpmeg
- useError and handle invoke errors 
- styles





## Done
- Easy kill child funtion usage
- Fix wrong unlaunchable directory (no git folder)
- ~~File dialog to open the location~~
- Create gource struct that is accessed through mods
    - These mods are separate for windows and linux 

- Setup for linux / macos test

- Lower scope for fs delete to only temp stuff

## Not doing 
- fix launching program on wrong monitor 
    - seems too hard without going into platform specifc unsafe api calls
    - if interested check out C:\Users\anhad\.cargo\registry\src\github.com-1ecc6299db9ec823\tao-0.16.1\src\platform_impl\windows\window.rs, 1108


- link the gource source as a submodule instead 
- Git-rs rust crate to temp download and host the repos, possibly logins