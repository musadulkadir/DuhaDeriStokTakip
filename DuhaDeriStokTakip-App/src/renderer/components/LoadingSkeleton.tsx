import React from 'react';
import { Box, Card, CardContent, Skeleton, Grid } from '@mui/material';

const LoadingSkeleton: React.FC = () => {
  return (
    <Box sx={{ p: 3 }}>
      {/* Header Skeleton */}
      <Box sx={{ mb: 4 }}>
        <Skeleton variant="text" width={200} height={40} />
        <Skeleton variant="text" width={300} height={20} />
      </Box>

      {/* Stats Cards Skeleton */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {[1, 2, 3, 4].map((item) => (
          <Grid item xs={12} sm={6} md={3} key={item}>
            <Card>
              <CardContent>
                <Skeleton variant="circular" width={40} height={40} sx={{ mb: 2 }} />
                <Skeleton variant="text" width="60%" height={30} />
                <Skeleton variant="text" width="40%" height={20} />
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Table Skeleton */}
      <Card>
        <CardContent>
          <Skeleton variant="text" width={150} height={30} sx={{ mb: 2 }} />
          {[1, 2, 3, 4, 5].map((row) => (
            <Box key={row} sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <Skeleton variant="rectangular" width="20%" height={40} />
              <Skeleton variant="rectangular" width="30%" height={40} />
              <Skeleton variant="rectangular" width="25%" height={40} />
              <Skeleton variant="rectangular" width="25%" height={40} />
            </Box>
          ))}
        </CardContent>
      </Card>
    </Box>
  );
};

export default LoadingSkeleton;
