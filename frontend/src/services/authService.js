import axios from 'axios';

const login = async (email, password) => {
    const response = await axios.post('http://localhost:3001/api/auth/login', {
        email,
        password
    });

    const data = response.data;
    return data;
};

export { login };


