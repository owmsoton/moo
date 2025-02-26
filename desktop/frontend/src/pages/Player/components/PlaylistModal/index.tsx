import { useEffect, useState, useRef } from 'react';

import { notificate } from '../../../../utils/notifications';
import { api } from '../../../../utils/api';
import { decode } from '../../../../utils/decode';

import { Container } from './styles';

import Back from '../../../../assets/back.svg';
import Play from '../../../../assets/play.svg';
import Save from '../../../../assets/heart.svg';
import Saved from '../../../../assets/heartfilled.svg';
import Download from '../../../../assets/download.svg';
import Sync from '../../../../assets/sync.svg';

import { Item } from '../../components/Item';

import { Video, Playlist } from '../../../../types';

export const PlaylistModal = ({ currentPlaylist, setCurrentPlaylist, setPlaylistModalOpened, setCurrentAudio, setCurrentStats }: {
    currentPlaylist: Playlist,
    setCurrentPlaylist: Function,
    setPlaylistModalOpened: Function,
    setCurrentAudio: Function,
    setCurrentStats: Function,
}) => {
    const [ alreadySaved, setAlreadySaved ] = useState<boolean>(false);
    const [ isCustom, setIsCustom ] = useState<boolean>(false);
    const saveRef = useRef<HTMLImageElement>(null);
    const syncRef = useRef<HTMLImageElement>(null);

    useEffect(() => {
        const playlists = window.localStorage.getItem('playlists');

        if (playlists !== null) {
            const playlist = JSON.parse(playlists).filter((i: Playlist) => i.id === currentPlaylist.id);
            
            if (playlist.length > 0) {
                setAlreadySaved(true);

                if (playlist[0].type === 'custom') setIsCustom(true);
            }
        }

        api.get(`/playlist?id=${ currentPlaylist.id }`)
            .then(({ data }) => setCurrentPlaylist((p: Playlist) => ({ ...p, videos: data.videos })))
            
            .catch(() => {
                notificate('error', 'Failed to get playlist.');

                setCurrentPlaylist({});

                setPlaylistModalOpened(false);
            });

    }, []);

    const handleDownload = () => {
        const settings = window.localStorage.getItem('settings');

        window.dispatchEvent(new Event('downloading'));

        if (settings !== null) {
            api.get(`/download?url=https://www.youtube.com/playlist?list=${ currentPlaylist.id }&path=${ JSON.parse(settings).path }`)
                .then(({ data }) => {
                    if (data.success) {
                        notificate('success', 'Download successfully');
                        
                    } else {
                        notificate('error', 'Failed to download music.');

                    }
                        
                    window.dispatchEvent(new Event('idle'));
                })

                .catch(() => {
                    notificate('error', 'Failed to download music.');

                    window.dispatchEvent(new Event('idle'));
                });
        }
    }

    const handlePlaylist = () => {
        let playlist = Object.assign({}, currentPlaylist);

        if (window.localStorage.getItem('playersettings') !== null) {
            const playerSettings = JSON.parse(window.localStorage.getItem('playersettings')!);

            if (playerSettings.random) {
                playlist.videos = playlist.videos
                    .map(i => ({ i, sort: Math.random() }))
                    .sort((a, b) => a.sort - b.sort)
                    .map(({ i }) => i);
            }
        }

        window.localStorage.setItem('songqueue', JSON.stringify(playlist.videos));

        window.dispatchEvent(new Event('newqueue'));
    }

    const handleSavePlaylist = () => {
        if (window.localStorage.getItem('playlists') !== null) {
            const playlists = JSON.parse(window.localStorage.getItem('playlists')!);

            playlists.unshift({
                ...currentPlaylist,
            });

            window.localStorage.setItem('playlists', JSON.stringify(playlists));

        } else {
            window.localStorage.setItem('playlists', JSON.stringify([{
                ...currentPlaylist,
            }]));
        }

        saveRef.current!.src = Saved;

        setAlreadySaved(true);
        
        window.dispatchEvent(new Event('playlistsaved'));
    }

    const handleRemovePlaylist = () => {
        const playlists = JSON.parse(window.localStorage.getItem('playlists')!);
        
        window.localStorage.setItem('playlists', JSON.stringify(playlists.filter((i: Video) => i.id !== currentPlaylist.id)));

        window.dispatchEvent(new Event('playlistsaved'));
    
        saveRef.current!.src = Save;
    
        setAlreadySaved(false);
    }

    const handleSync = () => {
        syncRef.current!.className = 'syncing';

        api.get(`/sync?id=${ currentPlaylist.id }`)
            .then(({ data }) => setCurrentPlaylist((p: Playlist) => ({ ...p, videos: data.videos })))
            .catch(() => notificate('error', 'Failed to force syncing'))
            .finally(() => syncRef.current!.className = '');
    }

    return (
        <Container>
            <div className="background" style={{ backgroundImage: `url("${ currentPlaylist.thumb }")` }}></div>
            
            <img id="back" src={ Back } width={ 20 } onClick={ () => setPlaylistModalOpened(false) } />
            
            <div className="content">
                <div className="title-playlist">
                    <div className="title-thumbnail" style={{ backgroundImage: `url("${ currentPlaylist.thumb }")` }} />

                    <div className="stats">
                        <h1>{ decode(currentPlaylist.title) }</h1>
                    
                        <p>{ currentPlaylist.videos && currentPlaylist.videos.length } songs</p>

                        <div className="buttons">
                            <img src={ Play } width={ 32 } onClick={ () => handlePlaylist() } />
                            
                            <img
                                src={ alreadySaved ? Saved : Save }
                                id="save"
                                ref={ saveRef }
                                width={ 28 }
                                style={{ padding: '0.7rem 0.65rem 0.65rem 0.65rem' }}
                                onClick={ alreadySaved ? () => handleRemovePlaylist() : () => handleSavePlaylist() }
                            />

                            <img
                                src={ Download }
                                width={ 28 }
                                style={{ padding: '0.65rem' }}
                                onClick={ () => handleDownload() }
                            />

                            {
                                isCustom &&
                                    <img
                                        src={ Sync }
                                        width={ 28 }
                                        onClick={ () => handleSync() }
                                        title="Forces sync"
                                        style={{ padding: '0.65rem' }}
                                        ref={ syncRef }
                                    />
                            }
                        </div>
                    </div>
                </div>

                <div className="items">
                    {
                        currentPlaylist.videos && currentPlaylist.videos.map((i, k) => (
                            <Item
                                key={ k }
                                title={ i.title }
                                thumb={ i.thumb }
                                id={ i.id }
                                author={ i.author }
                                duration={ i.duration }
                                views={ i.views }
                                setCurrentAudio={ setCurrentAudio }
                                setCurrentStats={ setCurrentStats }
                                position={ k }
                                playlist={ currentPlaylist }
                            />
                        ))
                    }
                </div>
            </div>
        </Container>
    );
}
