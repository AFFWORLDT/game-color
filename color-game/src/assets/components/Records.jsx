import React, { useEffect, useState } from 'react';
import axios from 'axios';
import socket from '../../hooks/Socket';

const apiUrl = import.meta.env.VITE_API_URL;

const Records = () => {
    const [results, setResults] = useState([]);

    const getResults = async () => {
        try {
            const { data } = await axios.get(`${apiUrl}/allRecords`);
            setResults(data);
        } catch (error) {
            console.log('Error:', error);
        }
    };

    const handleDataAll = (data) => {
        setResults(data)
    }

    useEffect(() => {
        getResults();

        // Subscribe to socket events if needed
        socket.on('allRecords', handleDataAll);
        return () => socket.off('allRecords', handleDataAll);
    }, [socket]);

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

    return (
        <div>
            <div className='d-flex justify-content-between fw-bold bg-white px-2 py-2 rounded'>
                <div>Period</div>
                <div>Result</div>
                <div>Price</div>
            </div>
            {results.length > 0 ? (
                results.map((data) => (
                    <div className='rounded py-2 my-1' key={data._id} style={{
                        display: 'grid',
                        gridTemplateColumns: 'auto auto auto',
                        justifyContent: 'space-between',
                        padding: '.4rem .7rem',
                        backgroundColor: '#E5E5FF',
                        fontWeight: '500',
                    }}>
                        <div>{data.parity}</div>
                        <div style={{
                            height: '1.5rem',
                            width: '1.5rem',
                            backgroundColor: getColorForResult(data.result),
                            borderRadius: '50%',
                            marginLeft: '-2rem',
                            border: '2px solid #fff',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                        }}></div>
                        <div>{data.price}</div>
                    </div>
                ))
            ) : (
                <h3 style={{
                    textAlign: 'center',
                    paddingTop: '4rem'
                }} >No data</h3>
            )}
        </div>
    );
};

export default Records;
