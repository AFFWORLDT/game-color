import React, { useEffect, useState } from 'react'
import socket from '../../hooks/Socket'
import axios from 'axios'
import { useAuth } from '../../hooks/AuthContext';
const apiUrl = import.meta.env.VITE_API_URL;

const UserRecords = () => {

    const [userData, setUserData] = useState([])
    const { auth } = useAuth();

    const getUserData = async () => {
        try {

            const { data } = axios.get(`${apiUrl}/getuserData`)

        } catch (error) {
            console.log('userRecords:', error)
        }
    }

    const handleUserRecords = (data) => {
        setUserData(data)
        // console.log(data)
    }

    // Function to get color for result
    const getColorForResult = (result) => {
        switch (result) {
            case 'red':
                return '#ff0000';
            case 'green':
                return '#006600';
            case 'violet':
                return '#8B008B';
            default:
                return '#666666';
        }
    };

    useEffect((() => {
        socket.emit('userBalance', { _id: auth.user._id });
        socket.on('userRecords', handleUserRecords)

        return () => (socket.off('userRecords', handleUserRecords))
    }), [socket])

    return (
        <div>
            <div className='d-flex justify-content-between fw-bold bg-white px-2 py-2 rounded '>
                <div>Period</div>
                <div>Result</div>
                <div>Price</div>
                <div>Status</div>
            </div>
            {userData?.map((data) => (
                <div className='rounded py-2 my-1' key={data._id} style={{
                    display: 'grid', gridTemplateColumns: 'auto auto auto auto', justifyContent: 'space-between',
                    padding: ' .4rem .7rem', backgroundColor: '#E5E5FF',
                    fontWeight: '500',
                }} >
                    <div>{data.period}</div>
                    <div style={{
                        height: '1.5rem', width: '1.5rem',
                        backgroundColor: getColorForResult(data.color), borderRadius: '50%',
                        marginLeft: '-2rem',
                        border: '2px solid #fff',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                    }} ></div>
                    <div>{data.betAmount}</div>
                    {/* Status badge */}
                    <div style={{
                        fontWeight: 'bold',
                        color: data.status === 'won' ? '#008000' : data.status === 'lost' ? '#ff0000' : '#888',
                        background: data.status === 'won' ? '#e6ffe6' : data.status === 'lost' ? '#ffe6e6' : '#f0f0f0',
                        borderRadius: '8px',
                        padding: '2px 10px',
                        display: 'inline-block',
                        minWidth: '60px',
                        textAlign: 'center',
                        fontSize: '0.9rem',
                    }}>
                        {data.status === 'won' ? 'Won' : data.status === 'lost' ? 'Lost' : 'Pending'}
                    </div>
                </div>
            ))}
        </div>
    )
}

export default UserRecords